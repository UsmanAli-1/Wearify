"use client";

import { Card } from "@/ui/card";
import { Button } from "@/ui/button";
import { Sparkles, Zap, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import BASE_URL, { authHeaders } from "@/config/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Plan = "basic" | "pro" | "premium";

export default function PlansPage() {
  const [loading, setLoading] = useState<Plan | "">("");
  const [userPlan, setUserPlan] = useState<string>("free");
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchUser = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/me`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUserPlan(data.plan || "free");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // initial fetch
  useEffect(() => {
    fetchUser();
  }, []);

  // on stripe redirect return — detect ?success=true or ?canceled=true
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Payment successful! Your plan has been upgraded.");
      // re-fetch user so plan + points update here
      fetchUser();
      // fire auth-changed so Header re-fetches too (points + plan badge)
      window.dispatchEvent(new Event("auth-changed"));
      // clean up url params without reload
      router.replace("/plans");
    }

    if (canceled === "true") {
      toast.error("Payment canceled.");
      router.replace("/plans");
    }
  }, [searchParams, router]);

  async function handleCheckout(plan: Plan): Promise<void> {
    setLoading(plan);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/payment/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data: { url?: string; message?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Please login to continue.");
        router.push("/signin");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="pb-5 pt-22 md:pt-8 w-full min-h-[calc(100vh-100px)] px-6 md:px-12 xl:px-20 flex flex-col items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full items-stretch">
        {/* BASIC */}
        <Card className="flex flex-col justify-between rounded-2xl p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl hover:scale-105 transition duration-300">
          <div className="flex flex-col">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-400/50 to-blue-600/90 text-white mb-3">
              <Sparkles />
            </div>
            <h3 className="text-2xl font-semibold text-white">Basic</h3>
            <p className="text-gray-400 text-sm mt-0.5">For starters</p>
            <h2 className="text-4xl font-bold text-white my-5">Rs. 1,200</h2>
            <p className="text-gray-400 text-lg mt-0.5">" 400 Points "</p>
            <ul className="text-sm text-gray-300 space-y-2 mt-4">
              <li>✔ Limited Generate images</li>
              <li>✔ Limited AI outfit suggestions</li>
              <li>✔ 400 usage points</li>
              <li>✔ Normal speed only</li>
            </ul>
          </div>
          <Button
            onClick={() => handleCheckout("basic")}
            disabled={userPlan === "basic" || loading === "basic"}
            className="w-full bg-gradient-to-r from-purple-400/50 to-blue-600/90 mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {userPlan === "basic"
              ? "Ø Current Plan"
              : loading === "basic"
                ? "Redirecting..."
                : "Get Started"}
          </Button>
        </Card>

        {/* PRO */}
        <Card className="flex flex-col justify-between rounded-2xl p-6 scale-105 border-2 border-purple-500/40 bg-white/10 backdrop-blur-lg shadow-2xl hover:scale-110 transition duration-300 relative">
          <span className="absolute top-4 right-4 text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
            Most Popular
          </span>
          <div className="flex flex-col">
            <div className="w-13 h-13 rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-400 to-blue-600 text-white mb-3 shadow-lg">
              <Zap />
            </div>
            <h3 className="text-2xl font-semibold text-white">Pro</h3>
            <p className="text-gray-300 text-sm mt-0.5">
              Best for regular users
            </p>
            <h2 className="text-4xl font-bold text-white my-5">Rs. 3,000</h2>
            <p className="text-gray-300 text-lg mt-0.5">" 1000 Points "</p>
            <ul className="text-sm text-gray-200 space-y-2 mt-4">
              <li>✔ Generate images</li>
              <li>✔ AI outfit suggestions</li>
              <li>✔ 1000 usage points</li>
              <li>✔ Faster processing</li>
            </ul>
          </div>
          <Button
            onClick={() => handleCheckout("pro")}
            disabled={userPlan === "pro" || loading === "pro"}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-700 text-white shadow-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {userPlan === "pro"
              ? "Ø Current Plan"
              : loading === "pro"
                ? "Redirecting..."
                : "Upgrade Now"}
          </Button>
        </Card>

        {/* PREMIUM */}
        <Card className="flex flex-col justify-between rounded-2xl p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl hover:scale-105 transition duration-300">
          <div className="flex flex-col">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-400/50 to-blue-600/90 text-white mb-3">
              <Crown />
            </div>
            <h3 className="text-2xl font-semibold text-white">Premium</h3>
            <p className="text-gray-400 text-sm mt-0.5">For power users</p>
            <h2 className="text-4xl font-bold text-white my-5">Rs. 6,000</h2>
            <p className="text-gray-400 text-lg mt-0.5">" 2000 Points "</p>
            <ul className="text-sm text-gray-300 space-y-2 mt-4">
              <li>✔ Unlimited Generate images</li>
              <li>✔ Unlimited AI outfit suggestions</li>
              <li>✔ 2000 usage points</li>
              <li>✔ Fast image generation</li>
            </ul>
          </div>
          <Button
            onClick={() => handleCheckout("premium")}
            disabled={userPlan === "premium" || loading === "premium"}
            className="w-full bg-gradient-to-r from-purple-400/50 to-blue-600/90 mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {userPlan === "premium"
              ? "Ø Current Plan"
              : loading === "premium"
                ? "Redirecting..."
                : "Go Premium"}
          </Button>
        </Card>
      </div>
    </section>
  );
}
