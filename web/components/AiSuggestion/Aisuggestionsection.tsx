"use client";

import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { X, Sparkles } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faShirt,
  faMars,
  faVenus,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import BASE_URL, { authHeaders } from "@/config/api";

type SuggestedGarment = {
  _id: string;
  name: string;
  imagePath: string;
};

export default function AiSuggestionSection() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedGarment[]>([]);

  useEffect(() => {
    const checkLogin = () => {
      fetch(`${BASE_URL}/api/users/me`, { headers: authHeaders() })
        .then((res) => setIsLoggedIn(res.ok))
        .catch(() => setIsLoggedIn(false));
    };
    checkLogin();
    window.addEventListener("auth-changed", checkLogin);
    return () => window.removeEventListener("auth-changed", checkLogin);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadedImage(URL.createObjectURL(file));
    setSuggestions([]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadedImage(URL.createObjectURL(file));
    setSuggestions([]);
  };

  const handleSuggest = async () => {
    if (!uploadedImage || !selectedFile) {
      toast.error("Please upload your photo first");
      return;
    }
    setLoading(true);
    setSuggestions([]);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("gender", gender);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/suggestions/suggest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.reason) {
          switch (data.reason) {
            case "multiple_people":
              toast.error("Only one person allowed");
              break;
            case "selfie":
              toast.error("Image too close. Upload full body");
              break;
            case "not_full_body":
              toast.error("Please upload a full body image");
              break;
            case "no_person_detected":
              toast.error("No person detected");
              break;
            default:
              toast.error("Invalid image");
          }
        } else if (data.message === "Not enough points") {
          toast.error("Not enough points to get suggestions");
        } else {
          toast.error(data.message || "Failed to get suggestions");
        }
        return;
      }

      window.dispatchEvent(new Event("auth-changed"));
      setSuggestions(data.suggestions || []);

      if ((data.suggestions || []).length === 0) {
        toast("No suggestions found. Try a different photo.", { icon: "🤔" });
      } else {
        toast.success("Outfits suggested!");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = (garment: SuggestedGarment) => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("prefill_person_base64", reader.result as string);
      localStorage.setItem("prefill_person_name", selectedFile.name);
      localStorage.setItem("prefill_garment_id", garment._id);
      localStorage.setItem("prefill_garment_image", garment.imagePath);
      localStorage.setItem("prefill_garment_name", garment.name);
      localStorage.setItem("prefill_is_ai_garment", "true"); // ← add this
      router.push("/");
    };
    reader.readAsDataURL(selectedFile);
  };

  const slots = [0, 1, 2, 3];

  // ── Suggest Me button — reused in both positions ──
  const SuggestButton = (
    <Button
      disabled={!isLoggedIn || !uploadedImage || loading}
      onClick={handleSuggest}
      className={`w-full py-6 rounded-full text-[#F5F5DC] shadow-xl
        hover:scale-105 duration-300 transition hover:from-[#4287f5] hover:to-[#6a339e]
        disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-auto
        bg-gradient-to-r from-purple-400/50 to-blue-600/90
        ${isLoggedIn && uploadedImage ? "cursor-pointer" : ""}`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin w-4 h-4 "
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Analyzing...
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          Suggest Me
        </>
      )}
    </Button>
  );

  return (
    <section className="w-full pt-22 md:pt-0 px-6 md:px-12 xl:px-20 flex flex-col gap-4 min-h-[calc(100vh-120px)]">
      {/* Heading */}
      <div className="text-center">
        {/* <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent"> */}
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500/55 to-blue-600/95 bg-clip-text text-transparent">
          AI Outfit Suggestions
        </h1>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* ── LEFT: Upload card + button below on mobile ── */}
          <div className="flex-shrink-0 w-full sm:w-[280px] md:w-[300px] lg:w-[300px] xl:w-[260px] 2xl:w-[320px] flex flex-col gap-3">
            <Card className="flex-1 hover:scale-[1.02] duration-300 transition shadow-xl bg-white/5 backdrop-blur-md border border-white/10 py-0">
              <CardContent className="h-full p-3 flex flex-col gap-2">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative flex-1 rounded-2xl border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center transition hover:border-purple-400/30 duration-300 min-h-[65svh] sm:min-h-[55svh]"
                >
                  {uploadedImage ? (
                    <>
                      <img
                        src={uploadedImage}
                        alt="Uploaded"
                        className="absolute inset-0 w-full h-full object-cover rounded-xl"
                      />
                      {!loading && (
                        <button
                          onClick={() => {
                            setUploadedImage(null);
                            setSelectedFile(null);
                            setSuggestions([]);
                          }}
                          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center transition duration-200 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-center px-3">
                      <h3 className="font-semibold text-white text-sm">
                        Upload Person
                      </h3>
                      <p className="text-gray-500 text-xs mb-4">
                        png , jpg , jpeg
                      </p>
                      <label
                        className={`font-semibold text-sm ${
                          isLoggedIn
                            ? "text-[#A06CE3] cursor-pointer"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!isLoggedIn}
                          onChange={handleUpload}
                        />
                        Select Image
                      </label>
                      {!isLoggedIn && (
                        <a
                          href="/signin"
                          className="text-xs text-[#A06CE3] mt-1"
                        >
                          Sign in to upload
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Gender Toggle */}
                <div className="flex rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <button
                    onClick={() => setGender("male")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition duration-200 cursor-pointer ${
                      gender === "male"
                        ? "bg-gradient-to-r from-purple-400/50 to-blue-600/90 text-white"
                        : "text-white/40 hover:text-white/70 bg-transparent"
                    }`}
                  >
                    <FontAwesomeIcon icon={faMars} className="text-[11px]" />
                    Male
                  </button>
                  <div className="w-px bg-white/10" />
                  <button
                    onClick={() => setGender("female")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition duration-200 cursor-pointer ${
                      gender === "female"
                        ? "bg-gradient-to-r from-purple-400/50 to-blue-600/90 text-white"
                        : "text-white/40 hover:text-white/70 bg-transparent"
                    }`}
                  >
                    <FontAwesomeIcon icon={faVenus} className="text-[11px]" />
                    Female
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Button — visible only on mobile (below card) */}
            <div className="sm:hidden pb-2">{SuggestButton}</div>
          </div>

          {/* ── RIGHT: Garment grid ── */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 sm:mb-0">
            {slots.map((i) => {
              const garment = suggestions[i];
              return (
                <Card
                  key={i}
                  className="group relative overflow-hidden hover:scale-[1.02] duration-300 transition shadow-xl bg-white/5 backdrop-blur-md border border-white/10 min-h-[44svh] sm:min-h-0"
                >
                  {garment ? (
                    <>
                      <img
                        src={garment.imagePath}
                        alt={garment.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-purple-400/70 to-blue-600/90 shadow">
                          {i + 1}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex flex-col justify-end p-3 gap-2">
                        <Button
                          onClick={() => handleTryOn(garment)}
                          className="w-full py-2 rounded-full text-xs font-medium text-white bg-gradient-to-r from-purple-400/80 to-blue-600/90 hover:from-[#4287f5] hover:to-[#6a339e] hover:scale-105 duration-200 transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                        >
                          <FontAwesomeIcon
                            icon={faShirt}
                            className="text-[10px]"
                          />
                          Try On
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 md:hidden">
                        <Button
                          onClick={() => handleTryOn(garment)}
                          className="w-full py-2 rounded-full text-xs font-medium text-white bg-gradient-to-r from-purple-400/80 to-blue-600/90 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FontAwesomeIcon
                            icon={faShirt}
                            className="text-[10px]"
                          />
                          Try On
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 m-3 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-2xl">
                      {loading ? (
                        <>
                          <Sparkles className="w-5 h-5 text-purple-400/40 animate-pulse" />
                          <p className="text-white/20 text-[10px]">
                            Finding {i + 1}...
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                            <FontAwesomeIcon
                              icon={faShirt}
                              className="text-white/15"
                            />
                          </div>
                          <p className="text-white/20 text-[10px]">
                            Outfit {i + 1}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Button — visible only on desktop (below left col) */}
        <div className="hidden sm:block w-full sm:w-[280px] md:w-[300px] lg:w-[300px] xl:w-[260px] 2xl:w-[320px] pb-6 sm:pb-0">
          {SuggestButton}
        </div>
      </div>
    </section>
  );
}
