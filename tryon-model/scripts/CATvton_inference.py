import os
import sys
import cv2 as cv2

# Set HuggingFace cache path
os.environ["HF_HUB_CACHE"] = r"D:\.cache\huggingface\hub"
os.environ["HF_HOME"] = "D:/.cache/huggingface"

import torch
import torch.nn.functional as F
from torchvision import transforms
import torchvision.transforms.functional as TF
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from diffusers import AutoencoderKL, UNet2DConditionModel, DDIMScheduler
from diffusers.utils.torch_utils import randn_tensor
from peft import PeftModel

from torchmetrics.image import PeakSignalNoiseRatio, StructuralSimilarityIndexMeasure
from torchmetrics.image.lpip import LearnedPerceptualImagePatchSimilarity

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ==============================
# CONFIG
# ==============================

DATASET_DIR = "../dataset_final"
BASE_MODEL = "runwayml/stable-diffusion-inpainting"
VAE_MODEL = "stabilityai/sd-vae-ft-mse"
OUTPUT_DIR = "catvton_finetuned_v4"
EPOCH = 21

IMG_HEIGHT = 512
IMG_WIDTH = 512
DDIM_STEPS = 30
GUIDANCE = 2.5
DEVICE = "cuda"

RESULTS_DIR = "catvton_finetuned_v4/results"
BATCH_MODE = False
TEST_PAIRS = "test_pairs.txt"
os.makedirs(RESULTS_DIR, exist_ok=True)

# ==============================
# CATVTON HELPER
# ==============================

def init_skip_cross_attn(unet):
    """Replace cross-attention with skip processors — no text conditioning."""
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
        if "attn2" in name:
            attn_procs[name] = SkipAttnProcessor()
        else:
            attn_procs[name] = proc
    unet.set_attn_processor(attn_procs)
    return unet


# ==============================
# LOAD MODELS
# ==============================

def load_catvton_attn_weights(unet, ckpt_path, version="mix"):
    sub_folder = {
        "mix": "mix-48k-1024",
        "vitonhd": "vitonhd-16k-512",
        "dresscode": "dresscode-16k-512",
    }[version]

    attn_path = os.path.join(ckpt_path, sub_folder, "attention", "model.safetensors")
    if not os.path.exists(attn_path):
        print(f"WARNING: CatVTON attention weights not found at {attn_path}")
        return unet

    try:
        from safetensors.torch import load_file
        from collections import defaultdict

        state_dict = load_file(attn_path)

        attn1_modules = []
        for name, module in unet.named_modules():
            if (name.endswith("attn1") and
                    hasattr(module, "to_q") and
                    hasattr(module, "to_k")):
                attn1_modules.append((name, module))

        ckpt_indices = sorted(set(int(k.split(".")[0]) for k in state_dict.keys()))
        idx_map = {i: ckpt_idx for i, ckpt_idx in enumerate(ckpt_indices)}

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
                obj = module
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

        print(f"  CatVTON attention weights loaded: {loaded}/{loaded + skipped}")

    except Exception as e:
        print(f"WARNING: Could not load attention weights: {e}")

    return unet


from peft.tuners.lora import LoraLayer
def apply_selective_lora_scale(unet, spatial_scale=0.2, texture_scale=1.2):
    """
    Zero out LoRA on spatial attention (to_q, to_k) — restores base model pose following.
    Keep LoRA on texture attention (to_v, to_out) — preserves South Asian garment quality.
    """
    for name, module in unet.named_modules():
        if isinstance(module, LoraLayer):
            for adapter_name in module.scaling:
                if any(k in name for k in ["to_q", "to_k"]):
                    module.scaling[adapter_name] = spatial_scale
                    print(f"  spatial zeroed : {name}")
                elif any(k in name for k in ["to_v", "to_out"]):
                    module.scaling[adapter_name] = texture_scale
                    print(f"  texture kept   : {name}")


def load_models(epoch=EPOCH):
    print(f"Loading models (epoch {epoch}) …")

    scheduler = DDIMScheduler.from_pretrained(BASE_MODEL, subfolder="scheduler")

    vae = AutoencoderKL.from_pretrained(
        VAE_MODEL
    ).to(DEVICE, dtype=torch.float16).eval()
    vae.requires_grad_(False)

    unet = UNet2DConditionModel.from_pretrained(BASE_MODEL, subfolder="unet")
    unet = init_skip_cross_attn(unet)

    # load pretrained CatVTON attention weights
    CATVTON_CKPT = r"D:\.cache\huggingface\hub\models--zhengchong--CatVTON\snapshots\2969fcf85fe62f2036605716f0b56f0b81d01d79"
    unet = load_catvton_attn_weights(unet, CATVTON_CKPT, version="mix")

    lora_path = os.path.join(OUTPUT_DIR, f"lora_epoch_{epoch}")
    unet = PeftModel.from_pretrained(unet, lora_path, is_trainable=False).to(DEVICE).eval()
    unet.requires_grad_(False)
    print(f"  LoRA loaded : {lora_path}")

    apply_selective_lora_scale(unet, spatial_scale=0.2, texture_scale=1.2)
    print("  LoRA: spatial attention (to_q/to_k) zeroed, texture (to_v/to_out) active")

    print("Models loaded.\n")
    return vae, unet, scheduler


# ==============================
# PREPROCESSING
# ==============================
def preprocess_image(pil_img, height, width):
    """Resize and normalize image to [-1, 1] tensor."""
    pil_img = pil_img.resize((width, height), Image.BILINEAR)
    t = transforms.ToTensor()(pil_img)
    t = transforms.Normalize([0.5] * 3, [0.5] * 3)(t)
    return t.unsqueeze(0)


def preprocess_mask(pil_mask, height, width):
    """Resize mask to [0,1] tensor."""
    pil_mask = pil_mask.resize((width, height), Image.NEAREST).convert("L")
    t = transforms.ToTensor()(pil_mask)
    return t.unsqueeze(0)


def tensor_to_pil(t):
    return transforms.ToPILImage()((t * 0.5 + 0.5).clamp(0, 1).cpu())


# ==============================
# CONSTANTS
# ==============================
GREY_OVERLAP_PX = 10
GREY = (128, 128, 128)  # RGB


# ==============================
# HELPER: 4-POINT GEOMETRY
# ==============================
def get_4_points_and_height(mask_np):
    contours, _ = cv2.findContours(mask_np, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    return {
        "shoulders": [(x, y), (x + w, y)],
        "bottom":    [(x, y + h), (x + w, y + h)],
        "height":    h,
        "y_bottom":  y + h,
        "x_left":    x,
        "x_right":   x + w
    }

# ==============================
# HELPER: HAND COMPOSITING
# ==============================
def composite_hands(result_img_rgb, person_img_rgb, identity_mask_path):
    if not identity_mask_path or not os.path.exists(identity_mask_path):
        return result_img_rgb

    identity_mask = cv2.imread(identity_mask_path, cv2.IMREAD_GRAYSCALE)
    if identity_mask is None:
        return result_img_rgb

    if identity_mask.ndim == 3:
        identity_mask = identity_mask[:, :, 0]

    if identity_mask.shape[:2] != result_img_rgb.shape[:2]:
        identity_mask = cv2.resize(
            identity_mask,
            (result_img_rgb.shape[1], result_img_rgb.shape[0]),
            interpolation=cv2.INTER_NEAREST
        )

    identity_mask_blur = cv2.GaussianBlur(identity_mask, (5, 5), 0)
    alpha = identity_mask_blur.astype(np.float32) / 255.0
    alpha = np.stack([alpha, alpha, alpha], axis=-1)

    person_float = person_img_rgb.astype(np.float32)
    result_float = result_img_rgb.astype(np.float32)

    composited = person_float * alpha + result_float * (1.0 - alpha)
    return composited.astype(np.uint8)

# ==============================
# HELPER: SUBTRACT HAND REGION FROM VTON MASK
# ==============================
def subtract_hands_from_mask(mask_np, identity_mask_path):
    if not identity_mask_path or not os.path.exists(identity_mask_path):
        return mask_np

    hand_mask = cv2.imread(identity_mask_path, cv2.IMREAD_GRAYSCALE)
    if hand_mask is None:
        return mask_np

    if hand_mask.ndim == 3:
        hand_mask = hand_mask[:, :, 0]

    if hand_mask.shape[:2] != mask_np.shape[:2]:
        hand_mask = cv2.resize(
            hand_mask,
            (mask_np.shape[1], mask_np.shape[0]),
            interpolation=cv2.INTER_NEAREST
        )

    if mask_np.ndim == 3:
        mask_np = mask_np[:, :, 0]

    result = mask_np.copy()
    result[hand_mask > 127] = 0
    return result


@torch.no_grad()
def run_inference(
        person_path, cloth_path, mask_path, agnostic_path, output_path,
        vae, unet, scheduler, sd_pipe=True, identity_mask_path=None,
        save_grid=True,
):
    # ==============================
    # DEBUG SETUP
    # ==============================
    debug_dir = os.path.join(os.path.dirname(os.path.abspath(output_path)), "debug")
    os.makedirs(debug_dir, exist_ok=True)
    _step = [0]

    def dbg(img_data, name):
        _step[0] += 1
        fname = f"{_step[0]:02d}_{name}.png"
        fpath = os.path.join(debug_dir, fname)
        if isinstance(img_data, np.ndarray):
            if img_data.ndim == 2:
                Image.fromarray(img_data.astype(np.uint8), mode='L').save(fpath)
            else:
                Image.fromarray(img_data.astype(np.uint8)).save(fpath)
        elif isinstance(img_data, torch.Tensor):
            # assume latent — normalize to [0,1] for visibility
            t = img_data.float().cpu()
            t = (t - t.min()) / (t.max() - t.min() + 1e-8)
            if t.ndim == 4: t = t[0]
            # average channels if >3
            if t.shape[0] > 3: t = t[:3]
            transforms.ToPILImage()(t).save(fpath)
        else:
            img_data.save(fpath)
        print(f"  [DBG {_step[0]:02d}] {name} → {fname}")

    # ==============================
    # LOAD INPUTS
    # ==============================
    person_pil_original = Image.open(person_path).convert("RGB")
    cloth_pil           = Image.open(cloth_path).convert("RGB")
    mask_pil            = Image.open(mask_path).convert("L")
    agnostic_pil        = Image.open(agnostic_path).convert("RGB")

    dbg(person_pil_original,          "00_input_person")
    dbg(cloth_pil,                     "00_input_cloth")
    dbg(mask_pil,                      "00_input_mask")
    dbg(agnostic_pil,                  "00_input_agnostic")

    # ==============================
    # PRE-FILL: GEOMETRY & AGNOSTIC EXTENSION
    # ==============================
    if sd_pipe is not None:
        print("Analyzing garment geometries...")

        source_mask_np = np.array(mask_pil)
        cloth_np       = np.array(cloth_pil)

        gray_cloth = cv2.cvtColor(cloth_np, cv2.COLOR_RGB2GRAY)
        _, target_mask_np = cv2.threshold(gray_cloth, 240, 255, cv2.THRESH_BINARY_INV)

        dbg(gray_cloth,      "geo_cloth_gray")
        dbg(target_mask_np,  "geo_target_mask_from_cloth")
        dbg(source_mask_np,  "geo_source_mask_from_file")

        source_geo = get_4_points_and_height(source_mask_np)
        target_geo = get_4_points_and_height(target_mask_np)

        print(f"  source_geo={source_geo}")
        print(f"  target_geo={target_geo}")

        if source_geo and target_geo:
            img_width, img_height = person_pil_original.size
            person_np   = np.array(person_pil_original)
            agnostic_np = np.array(agnostic_pil)

            if agnostic_np.shape != person_np.shape:
                agnostic_np = cv2.resize(agnostic_np, (img_width, img_height))

            shoulder_y    = source_geo["shoulders"][0][1]
            height_diff   = source_geo["height"] - target_geo["height"]
            source_bottom = source_geo["y_bottom"]
            target_bottom = int(min(shoulder_y + target_geo["height"], img_height))
            cutoff_y      = target_bottom

            print(f"  shoulder_y={shoulder_y}, source_bottom={source_bottom}, "
                  f"target_bottom={target_bottom}, height_diff={height_diff}")

            # draw geometry bounding boxes on person for debug
            geo_vis = person_np.copy()
            cv2.rectangle(geo_vis,
                          (source_geo["x_left"], source_geo["shoulders"][0][1]),
                          (source_geo["x_right"], source_geo["y_bottom"]),
                          (0, 255, 0), 2)           # green = source (person mask)
            cv2.line(geo_vis, (0, cutoff_y), (img_width, cutoff_y), (255, 0, 0), 2)   # blue = cutoff_y
            cv2.line(geo_vis, (0, source_bottom), (img_width, source_bottom), (0, 0, 255), 2)  # red = source_bottom
            dbg(geo_vis, f"geo_vis_hdiff{height_diff}")

            # ==========================================
            # CASE A
            # ==========================================
            if height_diff > 15:
                print(f"[Case A] Target shorter by {height_diff}px. Running SD inpainting...")

                from diffusers import StableDiffusionInpaintPipeline
                dEVICE = "cuda" if torch.cuda.is_available() else "cpu"

                sd = StableDiffusionInpaintPipeline.from_pretrained(
                    "runwayml/stable-diffusion-inpainting",
                    torch_dtype=torch.float16,
                    cache_dir="D:/.cache/huggingface/hub",
                    local_files_only=True,
                    safety_checker=None,
                ).to(dEVICE)

                clean_composite = person_np.copy()
                clean_composite[0:cutoff_y, :] = agnostic_np[0:cutoff_y, :]
                dbg(clean_composite, "caseA_clean_composite")

                inpaint_mask = np.zeros((img_height, img_width), dtype=np.uint8)
                inpaint_mask[cutoff_y:source_bottom,
                             source_geo["x_left"]:source_geo["x_right"]] = 255
                dbg(inpaint_mask, "caseA_inpaint_mask_before_blur")

                inpaint_mask = cv2.GaussianBlur(inpaint_mask, (9, 9), 0)
                inpaint_mask[0:cutoff_y, :] = 0
                dbg(inpaint_mask, "caseA_inpaint_mask_after_blur")

                torch.cuda.empty_cache()

                inpainted_image = sd(
                    prompt="baggy trousers, shalwar, lower body clothing, continuous fabric folds, seamless background",
                    negative_prompt="shirt tail, kurta, top garment, blurry, mutated, extra limbs, bad anatomy, artifacts, seams",
                    image=Image.fromarray(clean_composite),
                    mask_image=Image.fromarray(inpaint_mask),
                    num_inference_steps=25,
                    strength=0.99,
                ).images[0]
                dbg(inpainted_image, "caseA_sd_raw_output")

                inpainted_np = np.array(inpainted_image)
                inpainted_np[0:cutoff_y, :] = clean_composite[0:cutoff_y, :]
                dbg(inpainted_np, "caseA_sd_output_restored")

                agnostic_with_hands = composite_hands(inpainted_np, person_np, identity_mask_path)
                agnostic_pil = Image.fromarray(agnostic_with_hands)
                dbg(agnostic_pil, "caseA_agnostic_after_sd")


                new_mask_np = np.zeros_like(source_mask_np)
                new_mask_np[0:cutoff_y, :] = source_mask_np[0:cutoff_y, :]
                dbg(new_mask_np, "caseA_new_mask_before_hand_subtract")

                dbg(new_mask_np, "caseA_new_mask_final")
                mask_pil = Image.fromarray(new_mask_np)

            # ==========================================
            # CASE B
            # ==========================================
            else:
                print(f"[Case B] Target longer by {abs(height_diff)}px. Applying grey fill...")

                extended = agnostic_np.copy()
                dbg(extended, "caseB_agnostic_before_fill")

                fill_y_start = max(0, source_bottom - GREY_OVERLAP_PX)
                fill_y_end   = min(target_bottom, img_height)
                fill_x_left  = source_geo["x_left"]
                fill_x_right = source_geo["x_right"]

                print(f"  fill_y=[{fill_y_start}:{fill_y_end}], fill_x=[{fill_x_left}:{fill_x_right}]")

                if fill_y_start < fill_y_end:
                    extended[fill_y_start:fill_y_end,
                             fill_x_left:fill_x_right] = GREY
                dbg(extended, "caseB_agnostic_after_grey_fill")

                agnostic_with_hands = composite_hands(extended, person_np, identity_mask_path)
                dbg(agnostic_with_hands, "caseB_agnostic_with_hands")
                agnostic_pil = Image.fromarray(agnostic_with_hands)

                new_mask_np = source_mask_np.copy()
                dbg(new_mask_np, "caseB_mask_before_extension")

                if fill_y_start < fill_y_end:
                    new_mask_np[fill_y_start:fill_y_end, fill_x_left:fill_x_right] = 255
                dbg(new_mask_np, "caseB_mask_after_extension")

                new_mask_np = subtract_hands_from_mask(new_mask_np, identity_mask_path)
                dbg(new_mask_np, "caseB_mask_final")
                mask_pil = Image.fromarray(new_mask_np)

    # ==============================
    # CLOTH PREPROCESSING
    # ==============================
    cloth_preprocessed = preprocess_image(cloth_pil, IMG_HEIGHT, IMG_WIDTH)
    cloth_vis = transforms.ToPILImage()(
        (cloth_preprocessed[0] * 0.5 + 0.5).clamp(0, 1).cpu()
    )
    dbg(cloth_vis, "cloth_preprocessed_fed_to_vae")

    # ==============================
    # STANDARD CatVTON LATENT PREP
    # ==============================
    person_t   = preprocess_image(person_pil_original, IMG_HEIGHT, IMG_WIDTH).to(DEVICE, dtype=torch.float16)
    agnostic_t = preprocess_image(agnostic_pil,        IMG_HEIGHT, IMG_WIDTH).to(DEVICE, dtype=torch.float16)
    mask_t     = preprocess_mask(mask_pil,             IMG_HEIGHT, IMG_WIDTH).to(DEVICE, dtype=torch.float16)
    cloth_t    = cloth_preprocessed.to(DEVICE, dtype=torch.float16)

    # save what's actually going into the VAE
    dbg(transforms.ToPILImage()((person_t[0] * 0.5 + 0.5).clamp(0,1).cpu()),   "vae_input_person")
    dbg(transforms.ToPILImage()((agnostic_t[0] * 0.5 + 0.5).clamp(0,1).cpu()), "vae_input_agnostic")
    dbg(transforms.ToPILImage()((mask_t[0]).clamp(0,1).cpu()),                   "vae_input_mask")

    with torch.amp.autocast(DEVICE):
        person_latent   = vae.encode(person_t).latent_dist.sample()   * vae.config.scaling_factor
        cloth_latent    = vae.encode(cloth_t).latent_dist.sample()    * vae.config.scaling_factor
        agnostic_latent = vae.encode(agnostic_t).latent_dist.sample() * vae.config.scaling_factor

        mask_latent   = F.interpolate(mask_t, size=person_latent.shape[-2:], mode="nearest").clamp(0, 1)
        masked_latent = agnostic_latent * (1.0 - mask_latent)

        dbg(cloth_latent,    "latent_cloth")
        dbg(agnostic_latent, "latent_agnostic")
        dbg(masked_latent,   "latent_masked_agnostic")
        dbg(mask_latent,     "latent_mask_downsampled")

        masked_concat     = torch.cat([masked_latent,  cloth_latent],                   dim=-2)
        mask_concat       = torch.cat([mask_latent,    torch.zeros_like(mask_latent)],  dim=-2)
        uncond_concat     = torch.cat([masked_latent,  torch.zeros_like(cloth_latent)], dim=-2)
        masked_concat_cfg = torch.cat([uncond_concat,  masked_concat])
        mask_concat_cfg   = torch.cat([mask_concat] * 2)

        generator = torch.Generator(device=torch.device(DEVICE))
        scheduler.set_timesteps(DDIM_STEPS)
        latents = randn_tensor(
            masked_concat.shape, generator=generator,
            device=torch.device(DEVICE), dtype=masked_concat.dtype,
        ) * scheduler.init_noise_sigma

        for t in scheduler.timesteps:
            lmi  = torch.cat([latents] * 2)
            lmi  = scheduler.scale_model_input(lmi, t)
            ui   = torch.cat([lmi, mask_concat_cfg, masked_concat_cfg], dim=1)
            pred = unet(ui, t, encoder_hidden_states=None, return_dict=False)[0]
            u, c = pred.chunk(2)
            pred = u + GUIDANCE * (c - u)
            latents = scheduler.step(pred, t, latents).prev_sample

        result_latent = latents.split(latents.shape[-2] // 2, dim=-2)[0]
        dbg(result_latent, "latent_result_before_decode")

        scaled_latent = (result_latent / vae.config.scaling_factor).to(DEVICE, dtype=torch.float16)
        result        = vae.decode(scaled_latent).sample.clamp(-1, 1)

    # ==============================
    # COMPOSITING
    # ==============================
    result_pil_raw = tensor_to_pil(result[0].float())
    dbg(result_pil_raw, "raw_vton_output_512")

    result_np = np.array(result_pil_raw)

    print("Compositing hands onto raw output...")
    final_np = composite_hands(result_np, np.array(person_pil_original), identity_mask_path)
    dbg(final_np, "final_after_hand_composite")

    # ==============================
    # SAVE
    # ==============================
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    result_pil = Image.fromarray(final_np)
    result_pil.save(output_path)

    if save_grid:
        cols = [
            ("Person",   person_pil_original),
            ("Agnostic", agnostic_pil),
            ("Cloth",    cloth_pil),
            ("Raw out",  result_pil_raw),
            ("Final",    result_pil),
        ]
        lh = 18
        W, H = IMG_WIDTH, IMG_HEIGHT
        grid = Image.new("RGB", (W * len(cols) + 2 * (len(cols) - 1), H + lh + 2), (40, 40, 40))
        try:
            font = ImageFont.truetype("arial.ttf", lh)
        except Exception:
            font = ImageFont.load_default()

        for i, (lbl, img) in enumerate(cols):
            cell = Image.new("RGB", (W, H + lh + 2), (30, 30, 30))
            cell.paste(img.resize((W, H), Image.LANCZOS), (0, lh + 2))
            ImageDraw.Draw(cell).text((2, 1), lbl, fill=(220, 220, 220), font=font)
            grid.paste(cell, (i * (W + 2), 0))

        grid_path = output_path.rsplit(".", 1)[0] + "_grid.jpg"
        grid.save(grid_path, quality=92)
        print(f"Grid  : {grid_path}")

    print(f"\nAll debug images saved to: {debug_dir}")
    return result_pil

# ==============================
# BATCH INFERENCE & EVALUATION
# ==============================

def run_batch(pairs_file, vae, unet, scheduler):
    """Run inference on all pairs and compute evaluation metrics."""
    with open(os.path.join(DATASET_DIR, pairs_file)) as f:
        pairs = [l.strip().split() for l in f if l.strip()]

    print(f"Running batch inference on {len(pairs)} pairs …\n")

    # Initialize metrics
    psnr_metric = PeakSignalNoiseRatio(data_range=1.0).to(DEVICE)
    ssim_metric = StructuralSimilarityIndexMeasure(data_range=1.0).to(DEVICE)
    lpips_metric = LearnedPerceptualImagePatchSimilarity(net_type='vgg', normalize=True).to(DEVICE)

    successful_pairs = 0

    for person_name, cloth_name in pairs:
        base_p = os.path.splitext(person_name)[0]
        base_c = os.path.splitext(cloth_name)[0]

        person_path = os.path.join(DATASET_DIR, "images", person_name)
        cloth_path = os.path.join(DATASET_DIR, "garments", cloth_name)
        mask_path = os.path.join(DATASET_DIR, "agnostic_mask", f"{base_p}_inpaint_mask.png")
        composite_mask_path = os.path.join(DATASET_DIR, "agnostic_mask", f"{base_p}_mask.png")
        agnostic_path = os.path.join(DATASET_DIR, "agnostic", person_name)
        output_path = os.path.join(RESULTS_DIR, f"{base_p}_{base_c}.png")

        # fallbacks
        if not os.path.exists(mask_path):
            mask_path = os.path.join(DATASET_DIR, "agnostic_mask", f"{base_p}.jpg")
        if not os.path.exists(agnostic_path):
            agnostic_path = os.path.join(DATASET_DIR, "agnostic", f"{base_p}_agnostic.jpg")

        try:
            result_pil = run_inference(
                person_path, cloth_path, mask_path, agnostic_path,
                output_path, vae, unet, scheduler,
                save_grid=False,
            )
            print(f"Completed {person_name} + {cloth_name}")

            # --- EVALUATION BLOCK ---
            gt_pil = Image.open(person_path).convert("RGB").resize((IMG_WIDTH, IMG_HEIGHT), Image.LANCZOS)

            gt_tensor = TF.to_tensor(gt_pil).unsqueeze(0).to(DEVICE)
            pred_tensor = TF.to_tensor(result_pil).unsqueeze(0).to(DEVICE)

            psnr_metric.update(pred_tensor, gt_tensor)
            ssim_metric.update(pred_tensor, gt_tensor)
            lpips_metric.update(pred_tensor, gt_tensor)

            successful_pairs += 1

        except Exception as e:
            print(f"  ERROR {person_name} + {cloth_name}: {e}")

    # Calculate final averages
    if successful_pairs > 0:
        final_psnr = psnr_metric.compute().item()
        final_ssim = ssim_metric.compute().item()
        final_lpips = lpips_metric.compute().item()

        print("\n" + "=" * 40)
        print(f"EVALUATION METRICS (Averaged over {successful_pairs} pairs):")
        print(f"  SSIM  (Higher is better): {final_ssim:.4f}")
        print(f"  PSNR  (Higher is better): {final_psnr:.4f} dB")
        print(f"  LPIPS (Lower is better):  {final_lpips:.4f}")
        print("=" * 40 + "\n")
    else:
        print("\nNo pairs were successfully processed for evaluation.")


# ==============================
# MAIN
# ==============================

if __name__ == "__main__":

    vae, unet, scheduler = load_models(epoch=EPOCH)

    if BATCH_MODE:
        run_batch(TEST_PAIRS, vae, unet, scheduler)

    else:

        # ── Single inference ───────────────────────
        run_inference(
            person_path="../dataset_final/images/31.jpg",
            cloth_path="../dataset_final/garments/83.jpg",
            mask_path="../dataset_final/agnostic_mask/31_inpaint_mask.png",
            agnostic_path="../dataset_final/agnostic/31_agnostic.jpg",
            identity_mask_path="../dataset_final/identity_masks/31.png",
            output_path="catvton_finetuned_v4/results/result_31.83.png",
            vae=vae,
            unet=unet,
            scheduler=scheduler,
            sd_pipe = True
        )