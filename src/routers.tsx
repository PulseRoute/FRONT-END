import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CenteredLoader } from "@/components/ui/loader";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Auto import pages
const pages = import.meta.glob("./pages/*/index.tsx");

// Lazy load EMS pages
const EMSDispatch = lazy(() => import("./pages/ems/dispatch/index"));
const EMSActiveCases = lazy(() => import("./pages/ems/active/index"));
const EMSHistory = lazy(() => import("./pages/ems/history/index"));
const EMSChat = lazy(() => import("./pages/ems/chat/index"));

// Lazy load Hospital pages
const HospitalDashboard = lazy(() => import("./pages/hospital/dashboard/index"));

const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
};

const pageTransition = {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.4,
};

const AppRoutes = () => {
    const location = useLocation();

    // Auto-generated routes for simple pages
    const autoRoutes = Object.keys(pages).map((path) => {
        const pageName = path.match(/\.\/pages\/(.*)\/index\.tsx$/)?.[1];
        if (!pageName || pageName.includes("/")) return null;
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
                {/* Auto-generated routes */}
                {autoRoutes}

                {/* EMS Dashboard Routes */}
                <Route element={<DashboardLayout role="ems" username="EMS Unit 01" />}>
                    <Route
                        path="/ems/dispatch"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <EMSDispatch />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/ems/active"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <EMSActiveCases />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/ems/history"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <EMSHistory />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/ems/chat"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <EMSChat />
                            </Suspense>
                        }
                    />
                </Route>

                {/* Hospital Dashboard Routes */}
                <Route element={<DashboardLayout role="hospital" username="SF General Hospital" />}>
                    <Route
                        path="/hospital/dashboard"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <HospitalDashboard />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/hospital/incoming"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <HospitalDashboard />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/hospital/chat"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <HospitalDashboard />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/hospital/beds"
                        element={
                            <Suspense fallback={<CenteredLoader />}>
                                <HospitalDashboard />
                            </Suspense>
                        }
                    />
                </Route>
            </Routes>
        </AnimatePresence>
    );
};

export default AppRoutes;
