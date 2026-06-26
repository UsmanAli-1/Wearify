import os
os.environ["HF_HUB_CACHE"] = r"D:\.cache\huggingface\hub"

import torch
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image, ImageDraw, ImageFont
from tqdm import tqdm

from diffusers import AutoencoderKL, UNet2DConditionModel, DDPMScheduler, DDIMScheduler
from diffusers.utils.torch_utils import randn_tensor

import bitsandbytes as bnb
from peft import LoraConfig, get_peft_model

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ==============================
# CONFIG
# ==============================

DATASET_DIR  = "../dataset_final"
TRAIN_PAIRS  = "train_pairs.txt"
TEST_PAIRS   = "test_pairs.txt"

BASE_MODEL   = "runwayml/stable-diffusion-inpainting"
VAE_MODEL    = "stabilityai/sd-vae-ft-mse"
CATVTON_CKPT = r"D:\.cache\huggingface\hub\models--zhengchong--CatVTON\snapshots\2969fcf85fe62f2036605716f0b56f0b81d01d79"
ATTN_VERSION = "mix"

OUTPUT_DIR   = "catvton_finetuned_v4"
VIS_DIR      = os.path.join(OUTPUT_DIR, "visualizations")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(VIS_DIR,    exist_ok=True)

IMG_HEIGHT   = 512
IMG_WIDTH    = 512
BATCH_SIZE   = 1
ACCUM_STEPS  = 4        # effective batch = BATCH_SIZE * ACCUM_STEPS = 4
EPOCHS       = 30
RESUME_EPOCH = 21
DEVICE       = "cuda"

# LoRA — self-attention only
LORA_RANK    = 16
LORA_ALPHA   = 32
LORA_TARGETS = [
    "attn1.to_q", "attn1.to_k", "attn1.to_v", "attn1.to_out.0",
]

VIS_SAMPLES      = 4
VIS_EVERY_EPOCHS = 3
VIS_DDIM_STEPS   = 30

NUM_WORKERS  = 2

# ── Loss weights ──────────────────────────────────────────────────────────────
W_MSE   = 1.0   # Standard diffusion noise-prediction loss
W_L1    = 0.5   # L1 smoothness
W_CLOTH = 1.0   # Garment-region loss


# ==============================
# CATVTON HELPERS
# ==============================

def init_skip_cross_attn(unet):
    import torch.nn as nn

    class SkipAttnProcessor(nn.Module):
        def __init__(self, *args, **kwargs):
            super().__init__()

        def __call__(self, attn, hidden_states,
                     encoder_hidden_states=None,
                     attention_mask=None, temb=None, **kwargs):
            return hidden_states

    attn_procs = {}
    for name, proc in unet.attn_processors.items():
        attn_procs[name] = SkipAttnProcessor() if "attn2" in name else proc
    unet.set_attn_processor(attn_procs)
    return unet


def load_catvton_attn_weights(unet, ckpt_path, version="mix"):
    sub_folder = {
        "mix":       "mix-48k-1024",
        "vitonhd":   "vitonhd-16k-512",
        "dresscode": "dresscode-16k-512",
    }[version]

    attn_path = os.path.join(ckpt_path, sub_folder, "attention", "model.safetensors")
    if not os.path.exists(attn_path):
        print(f"WARNING: CatVTON attention weights not found at {attn_path}")
        return unet

    try:
        from safetensors.torch import load_file

        state_dict = load_file(attn_path)

        attn1_modules = [
            (name, module)
            for name, module in unet.named_modules()
            if name.endswith("attn1") and hasattr(module, "to_q") and hasattr(module, "to_k")
        ]
        print(f"  attn1 modules found: {len(attn1_modules)}")

        ckpt_indices = sorted(set(int(k.split(".")[0]) for k in state_dict.keys()))
        idx_map      = {i: ci for i, ci in enumerate(ckpt_indices)}

        loaded = skipped = 0
        for our_idx, (name, module) in enumerate(attn1_modules):
            ckpt_idx = idx_map.get(our_idx)
            if ckpt_idx is None:
                continue
            module_weights = {
                k.split(".", 1)[1]: v
                for k, v in state_dict.items()
                if k.startswith(f"{ckpt_idx}.")
            }
            for attr, weight in module_weights.items():
                parts = attr.split(".")
                obj   = module
                try:
                    for p in parts[:-1]:
                        obj = getattr(obj, p)
                    param = getattr(obj, parts[-1])
                    if isinstance(param, torch.nn.Parameter):
                        if param.shape == weight.shape:
                            with torch.no_grad():
                                param.copy_(weight.to(param.device))
                            loaded += 1
                        else:
                            skipped += 1
                except AttributeError:
                    skipped += 1

        print(f"  Loaded {loaded}/{loaded + skipped} attention weights")

    except Exception as e:
        print(f"WARNING: Could not load attention weights: {e}")
        import traceback; traceback.print_exc()

    return unet


# ==============================
# DATASET
# ==============================

class KurtaDataset(Dataset):
    def __init__(self, root, pairs_file, height=IMG_HEIGHT, width=IMG_WIDTH):
        self.root   = root
        self.height = height
        self.width  = width

        with open(os.path.join(root, pairs_file)) as f:
            self.pairs = [l.strip().split() for l in f if l.strip()]

        self.img_resize  = transforms.Resize(
            (height, width), interpolation=transforms.InterpolationMode.BILINEAR
        )
        self.mask_resize = transforms.Resize(
            (height, width), interpolation=transforms.InterpolationMode.NEAREST
        )
        self.normalize   = transforms.Normalize([0.5] * 3, [0.5] * 3)
        self.to_tensor   = transforms.ToTensor()

    def __len__(self):
        return len(self.pairs)

    @staticmethod
    def _find(candidates):
        for p in candidates:
            if os.path.exists(p):
                return p
        raise FileNotFoundError(f"None found: {candidates}")

    def __getitem__(self, idx):
        person_name, cloth_name = self.pairs[idx]
        base_p = os.path.splitext(person_name)[0]
        base_c = os.path.splitext(cloth_name)[0]
        root   = self.root

        person_path = self._find([
            os.path.join(root, "images", person_name),
            os.path.join(root, "images", f"{base_p}.jpg"),
            os.path.join(root, "images", f"{base_p}.png"),
        ])
        agnostic_path = self._find([
            os.path.join(root, "agnostic", f"{base_p}_agnostic.jpg"),
            os.path.join(root, "agnostic", f"{base_p}_agnostic.png"),
            os.path.join(root, "agnostic", person_name),
            os.path.join(root, "agnostic", f"{base_p}.jpg"),
            os.path.join(root, "agnostic", f"{base_p}.png"),
        ])
        mask_path = self._find([
            os.path.join(root, "agnostic_mask", f"{base_p}_inpaint_mask.png"),
            os.path.join(root, "agnostic_mask", f"{base_p}_mask.png"),
            os.path.join(root, "agnostic_mask", f"{base_p}.png"),
            os.path.join(root, "agnostic_mask", f"{base_p}.jpg"),
        ])
        cloth_path = self._find([
            os.path.join(root, "garments", cloth_name),
            os.path.join(root, "garments", f"{base_c}.jpg"),
            os.path.join(root, "garments", f"{base_c}.png"),
        ])

        person   = Image.open(person_path).convert("RGB")
        agnostic = Image.open(agnostic_path).convert("RGB")
        mask     = Image.open(mask_path).convert("L")
        cloth    = Image.open(cloth_path).convert("RGB")

        # ── Resize ────────────────────────────────────────────────────
        person   = self.img_resize(person)
        agnostic = self.img_resize(agnostic)
        mask     = self.mask_resize(mask)
        cloth    = self.img_resize(cloth)

        # ── Tensor + normalize ────────────────────────────────────────
        person_t   = self.normalize(self.to_tensor(person))
        agnostic_t = self.normalize(self.to_tensor(agnostic))
        mask_t     = self.to_tensor(mask)
        cloth_t    = self.normalize(self.to_tensor(cloth))

        return {
            "person"      : person_t,
            "agnostic"    : agnostic_t,
            "mask"        : mask_t,
            "cloth"       : cloth_t,
            "person_name" : person_name,
        }


# ==============================
# VISUALISATION
# ==============================

def tensor_to_pil(t):
    return transforms.ToPILImage()((t * 0.5 + 0.5).clamp(0, 1).cpu())


def label_img(img, text, lh=16):
    out = Image.new("RGB", (img.width, img.height + lh + 2), (30, 30, 30))
    out.paste(img, (0, lh + 2))
    draw = ImageDraw.Draw(out)
    try:    font = ImageFont.truetype("arial.ttf", lh)
    except: font = ImageFont.load_default()
    draw.text((2, 1), text, fill=(220, 220, 220), font=font)
    return out


@torch.no_grad()
def run_visualization(epoch, vis_batches, vae, unet, scheduler_vis):
    unet.eval()

    labels = ["Person", "Agnostic", "Cloth", "Mask", "Output", "Composite"]
    lh     = 18
    cw, ch = IMG_WIDTH, IMG_HEIGHT
    sep    = 2
    grid   = Image.new(
        "RGB",
        (cw * len(labels) + sep * (len(labels) - 1),
         (ch + lh) * len(vis_batches) + sep * (len(vis_batches) - 1)),
        (50, 50, 50),
    )

    for r, batch in enumerate(vis_batches):
        person   = batch["person"].to(DEVICE)
        agnostic = batch["agnostic"].to(DEVICE)
        mask     = batch["mask"].to(DEVICE)
        cloth    = batch["cloth"].to(DEVICE)

        with torch.amp.autocast(DEVICE):
            person_latent   = vae.encode(person).latent_dist.sample()   * vae.config.scaling_factor
            agnostic_latent = vae.encode(agnostic).latent_dist.sample() * vae.config.scaling_factor
            cloth_latent    = vae.encode(cloth).latent_dist.sample()    * vae.config.scaling_factor

            mask_latent   = F.interpolate(mask, size=person_latent.shape[-2:], mode="nearest")
            masked_latent = agnostic_latent * (mask_latent < 0.5)

            masked_concat     = torch.cat([masked_latent, cloth_latent],                   dim=-2)
            mask_concat       = torch.cat([mask_latent,   torch.zeros_like(mask_latent)],  dim=-2)
            uncond_concat     = torch.cat([masked_latent, torch.zeros_like(cloth_latent)], dim=-2)
            masked_concat_cfg = torch.cat([uncond_concat, masked_concat])
            mask_concat_cfg   = torch.cat([mask_concat]  * 2)

            scheduler_vis.set_timesteps(VIS_DDIM_STEPS)
            latents = randn_tensor(
                masked_concat.shape, device=DEVICE, dtype=masked_concat.dtype
            ) * scheduler_vis.init_noise_sigma

            for t in scheduler_vis.timesteps:
                lmi  = torch.cat([latents] * 2)
                lmi  = scheduler_vis.scale_model_input(lmi, t)
                ui   = torch.cat([lmi, mask_concat_cfg, masked_concat_cfg], dim=1)
                pred = unet(ui, t, encoder_hidden_states=None, return_dict=False)[0]
                u, c = pred.chunk(2)
                pred = u + 2.5 * (c - u)
                latents = scheduler_vis.step(pred, t, latents).prev_sample

            result_latent = latents.split(latents.shape[-2] // 2, dim=-2)[0]
            result = vae.decode(result_latent / vae.config.scaling_factor).sample.clamp(-1, 1)

        mask_full = F.interpolate(mask, size=(IMG_HEIGHT, IMG_WIDTH), mode="nearest")
        comp      = (result * mask_full + person * (1 - mask_full)).clamp(-1, 1)
        mask_vis  = mask_full.expand(-1, 3, -1, -1) * 2 - 1

        row_imgs = [
            tensor_to_pil(person[0]),
            tensor_to_pil(agnostic[0]),
            tensor_to_pil(cloth[0]),
            tensor_to_pil(mask_vis[0]),
            tensor_to_pil(result[0]),
            tensor_to_pil(comp[0]),
        ]
        for c_idx, (img, lbl) in enumerate(zip(row_imgs, labels)):
            cell = label_img(img.resize((cw, ch), Image.LANCZOS), lbl, lh)
            grid.paste(cell, (c_idx * (cw + sep), r * (ch + lh + sep)))

    path = os.path.join(VIS_DIR, f"epoch_{epoch:04d}.jpg")
    grid.save(path, quality=92)
    print(f"  📸 Visualization → {path}")
    unet.train()


# ==============================
# TRAINING
# ==============================

def main():
    print("CatVTON Fine-tuning v4 — Pakistani Kurta Dataset")
    print(f"Resolution      : {IMG_WIDTH}×{IMG_HEIGHT}")
    print(f"LoRA rank       : {LORA_RANK}")
    print(f"Effective batch : {BATCH_SIZE} × {ACCUM_STEPS} = {BATCH_SIZE * ACCUM_STEPS}")
    print(f"Loss weights    : MSE={W_MSE}  L1={W_L1}  cloth={W_CLOTH}\n")

    # ── Schedulers ────────────────────────────────────────────────────
    noise_scheduler = DDPMScheduler.from_pretrained(BASE_MODEL, subfolder="scheduler")
    scheduler_vis   = DDIMScheduler.from_pretrained(BASE_MODEL, subfolder="scheduler")

    # ── VAE ───────────────────────────────────────────────────────────
    vae = AutoencoderKL.from_pretrained(VAE_MODEL).to(DEVICE, dtype=torch.float16)
    vae.requires_grad_(False)
    vae.eval()
    print("VAE loaded (stabilityai/sd-vae-ft-mse)")

    # ── UNet ──────────────────────────────────────────────────────────
    unet = UNet2DConditionModel.from_pretrained(BASE_MODEL, subfolder="unet")
    unet = init_skip_cross_attn(unet)
    unet = load_catvton_attn_weights(unet, CATVTON_CKPT, version=ATTN_VERSION)
    unet = unet.to(DEVICE)

    # ── LoRA on self-attention ─────────────────────────────────────────
    lora_config = LoraConfig(
        r=LORA_RANK,
        lora_alpha=LORA_ALPHA,
        target_modules=LORA_TARGETS,
        lora_dropout=0.05,
        bias="none",
    )
    unet = get_peft_model(unet, lora_config)
    unet.enable_gradient_checkpointing()
    unet.print_trainable_parameters()

    # ── Resume ────────────────────────────────────────────────────────
    if RESUME_EPOCH > 0:
        ckpt = os.path.join(OUTPUT_DIR, f"lora_epoch_{RESUME_EPOCH}")
        if os.path.exists(ckpt):
            from peft import PeftModel
            unet = PeftModel.from_pretrained(
                unet.base_model.model, ckpt, is_trainable=True
            ).to(DEVICE)
            print(f"Resumed from epoch {RESUME_EPOCH}")

    # ── Optimizer ─────────────────────────────────────────────────────
    optimizer = bnb.optim.AdamW8bit(
        filter(lambda p: p.requires_grad, unet.parameters()),
        lr=1e-5,
        weight_decay=1e-2,
    )

    try:
        unet.enable_xformers_memory_efficient_attention()
        print("xformers enabled")
    except Exception as e:
        print(f"xformers not available: {e}")

    scaler = torch.amp.GradScaler("cuda")

    # ── Datasets / loaders ────────────────────────────────────────────
    train_dataset = KurtaDataset(DATASET_DIR, TRAIN_PAIRS)
    test_dataset  = KurtaDataset(DATASET_DIR, TEST_PAIRS)

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=(NUM_WORKERS > 0),
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=1,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        persistent_workers=(NUM_WORKERS > 0),
    )

    print(f"\nTrain pairs : {len(train_dataset)}")
    print(f"Test  pairs : {len(test_dataset)}")

    print(f"Fixing {VIS_SAMPLES} vis samples from test set …")
    vis_batches = [b for i, b in enumerate(test_loader) if i < VIS_SAMPLES]
    print(f"  {len(vis_batches)} vis samples fixed.\n")

    # ── Training loop ─────────────────────────────────────────────────
    for epoch in range(RESUME_EPOCH, EPOCHS):

        progress = tqdm(train_loader, desc=f"Epoch {epoch + 1}/{EPOCHS}")
        optimizer.zero_grad(set_to_none=True)

        for step, batch in enumerate(progress):

            with torch.amp.autocast("cuda"):

                # ── Encode ────────────────────────────────────────────
                with torch.no_grad():
                    person_latent   = vae.encode(
                        batch["person"].to(DEVICE)
                    ).latent_dist.sample() * vae.config.scaling_factor

                    agnostic_latent = vae.encode(
                        batch["agnostic"].to(DEVICE)
                    ).latent_dist.sample() * vae.config.scaling_factor

                    cloth_latent    = vae.encode(
                        batch["cloth"].to(DEVICE)
                    ).latent_dist.sample() * vae.config.scaling_factor

                    mask_latent = F.interpolate(
                        batch["mask"].to(DEVICE),
                        size=person_latent.shape[-2:], mode="nearest"
                    ).clamp(0, 1)

                    masked_latent = agnostic_latent * (mask_latent < 0.5)
                    del agnostic_latent

                # ── Add noise ─────────────────────────────────────────
                noise     = torch.randn_like(person_latent)
                timesteps = torch.randint(
                    0,
                    noise_scheduler.config.num_train_timesteps,
                    (person_latent.shape[0],),
                    device=DEVICE,
                )
                noisy_person = noise_scheduler.add_noise(person_latent, noise, timesteps)

                # ── CatVTON height-axis concat ────────────────────────
                noisy_concat  = torch.cat([noisy_person,  cloth_latent],                  dim=-2)
                masked_concat = torch.cat([masked_latent, cloth_latent],                  dim=-2)
                mask_concat   = torch.cat([mask_latent,   torch.zeros_like(mask_latent)], dim=-2)

                unet_input = torch.cat([noisy_concat, mask_concat, masked_concat], dim=1)
                del masked_latent, noisy_concat, masked_concat, mask_concat

                model_pred = unet(
                    unet_input,
                    timesteps,
                    encoder_hidden_states=None,
                    return_dict=False,
                )[0]
                del unet_input

                # Person (upper) half of prediction only
                model_pred_person = model_pred.split(model_pred.shape[-2] // 2, dim=-2)[0]
                del model_pred

                # ── Standard noise-prediction losses ──────────────────
                loss_mse   = F.mse_loss(model_pred_person, noise)
                loss_l1    = F.l1_loss(model_pred_person,  noise)

                # Garment-region loss
                loss_cloth = F.l1_loss(
                    model_pred_person * mask_latent,
                    noise             * mask_latent,
                )

                # ── Combined loss ─────────────────────────────────────
                loss = (
                    W_MSE   * loss_mse
                    + W_L1    * loss_l1
                    + W_CLOTH * loss_cloth
                ) / ACCUM_STEPS

                # Free tensors no longer needed
                del model_pred_person, noisy_person, person_latent
                del cloth_latent

            scaler.scale(loss).backward()

            # Step only every ACCUM_STEPS to simulate larger batch
            if (step + 1) % ACCUM_STEPS == 0:
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)

            if step % 50 == 0:
                torch.cuda.empty_cache()

            progress.set_postfix({
                "loss"  : round(loss.item() * ACCUM_STEPS, 4),
                "mse"   : round(loss_mse.item(),           4),
                "cloth" : round(loss_cloth.item(),         4),
            })

        # Flush any leftover accumulated gradients at epoch end
        if (step + 1) % ACCUM_STEPS != 0:
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad(set_to_none=True)

        # ── Save checkpoint ───────────────────────────────────────────
        ep = epoch + 1
        unet.save_pretrained(os.path.join(OUTPUT_DIR, f"lora_epoch_{ep}"))
        print(f"Saved checkpoint: lora_epoch_{ep}")

        # ── Visualize ─────────────────────────────────────────────────
        if ep % VIS_EVERY_EPOCHS == 0 or ep == 1:
            print(f"\nGenerating visualizations epoch {ep} …")
            run_visualization(ep, vis_batches, vae, unet, scheduler_vis)

        print(f"Epoch {ep} done.\n")

    print("Fine-tuning complete.")
    print(f"Checkpoints saved in: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()