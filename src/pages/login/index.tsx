import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ambulance, Building2 } from "lucide-react";
import { authApi } from "@/api";

type AccountType = "ems" | "hospital";

const LoginPage = () => {
    const navigate = useNavigate();
    const [accountType, setAccountType] = useState<AccountType>("ems");
    const [form, setForm] = useState({ email: "", password: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await authApi.login({
                email: form.email,
                password: form.password,
            });

            // 사용자 정보 저장
            localStorage.setItem("user_id", response.user_id);
            localStorage.setItem("user_type", response.user_type);
            localStorage.setItem("user_name", response.user_name);

            // 사용자 타입에 따라 라우팅
            if (response.user_type === "hospital") {
                navigate("/hospital/dashboard");
            } else {
                navigate("/ems/dispatch");
            }
        } catch (err) {
            setError("Login failed. Please check your email and password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Main Content */}
            <main className="flex-1 flex flex-col justify-center px-6">
                <div className="w-full max-w-sm mx-auto">
                    {/* Title */}
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Sign In
                    </h1>
                    <p className="text-slate-500 mb-10">
                        Log in to access your account
                    </p>

                    {/* Account Type Selection */}
                    <div className="flex gap-3 mb-8">
                        <button
                            type="button"
                            onClick={() => setAccountType("ems")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                                accountType === "ems"
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}
                        >
                            <Ambulance className="size-5" />
                            <span className="font-medium">EMS</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAccountType("hospital")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                                accountType === "hospital"
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}
                        >
                            <Building2 className="size-5" />
                            <span className="font-medium">Hospital</span>
                        </button>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">
                                {error}
                            </div>
                        )}
                        <div>
                            <Input
                                type="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                                className="h-14 px-4 text-base bg-slate-50 border-0 rounded-xl placeholder:text-slate-400 focus:bg-slate-100 focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <Input
                                type="password"
                                placeholder="Password"
                                value={form.password}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        password: e.target.value,
                                    })
                                }
                                className="h-14 px-4 text-base bg-slate-50 border-0 rounded-xl placeholder:text-slate-400 focus:bg-slate-100 focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 text-base font-semibold bg-blue-500 hover:bg-blue-600 rounded-xl mt-6 disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                        </Button>
                    </form>

                    {/* Footer Links */}
                    <div className="flex items-center justify-center gap-4 mt-8 text-sm text-slate-500">
                        <button type="button" className="hover:text-slate-700">
                            Forgot Username
                        </button>
                        <span className="text-slate-300">|</span>
                        <button type="button" className="hover:text-slate-700">
                            Forgot Password
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
