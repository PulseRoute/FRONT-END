import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CenteredLoader } from "@/components/ui/loader";

// 모든 index.tsx 자동 가져오기
const pages = import.meta.glob("./pages/*/index.tsx");

const pageVariants = {
    initial: {
        opacity: 0,
    },
    in: {
        opacity: 1,
    },
    out: {
        opacity: 0,
    },
};

const pageTransition = {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.4,
};

const AppRoutes = () => {
    const location = useLocation();
    const routes = Object.keys(pages).map((path) => {
        const pageName = path.match(/\.\/pages\/(.*)\/index\.tsx$/)?.[1];
        if (!pageName) return null;
        const PageComponent = lazy(pages[path] as () => Promise<any>);

        return (
            <Route
                key={pageName}
                path={pageName === "main" ? "/" : `/${pageName}`}
                element={
                    <Suspense fallback={<CenteredLoader />}>
                        <motion.div
                            key={pageName}
                            initial="initial"
                            animate="in"
                            variants={pageVariants}
                            transition={pageTransition}
                        >
                            <PageComponent />
                        </motion.div>
                    </Suspense>
                }
            />
        );
    });

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {routes}
            </Routes>
        </AnimatePresence>
    );
};

export default AppRoutes;
