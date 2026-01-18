import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

const Header = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6">
            <div className="flex items-center justify-between">
                {/* 좌측 로고 */}
                <Link to="/" className="text-xl font-bold text-white">
                    PulseRoute
                </Link>

                {/* 우측 로그인 버튼 */}
                <Link to="/login">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-white hover:bg-white/10 hover:text-white transition-all duration-300"
                    >
                        <User className="size-4" />
                        <span>Login</span>
                    </Button>
                </Link>
            </div>
        </header>
    );
};

export default Header;
