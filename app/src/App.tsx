import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { BorrowPage } from "./pages/BorrowPage.tsx";
import { LendPage } from "./pages/LendPage.tsx";
import { LeveragePage } from "./pages/LeveragePage.tsx";
import { PortfolioPage } from "./pages/PortfolioPage.tsx";

function Header() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    return (
        <header className="flex items-center justify-between px-6 py-4 border-b border-base-border">
            <div className="flex items-center gap-8">
                <span className="text-lg font-bold tracking-tight">PolyP2P</span>
                <nav className="flex gap-1">
                    <NavLink
                        to="/borrow"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-base-alt text-primary"
                                    : "text-secondary hover:text-primary"
                            }`
                        }
                    >
                        Borrow
                    </NavLink>
                    <NavLink
                        to="/lend"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-base-alt text-primary"
                                    : "text-secondary hover:text-primary"
                            }`
                        }
                    >
                        Lend
                    </NavLink>
                    <NavLink
                        to="/leverage"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-base-alt text-primary"
                                    : "text-secondary hover:text-primary"
                            }`
                        }
                    >
                        Leverage
                    </NavLink>
                    <NavLink
                        to="/portfolio"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-base-alt text-primary"
                                    : "text-secondary hover:text-primary"
                            }`
                        }
                    >
                        Portfolio
                    </NavLink>
                </nav>
            </div>
            <div>
                {isConnected ? (
                    <button
                        onClick={() => disconnect()}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-base-alt text-primary hover:bg-base-border transition-colors press-down"
                    >
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                    </button>
                ) : (
                    <button
                        onClick={() => connect({ connector: connectors[0] })}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors press-down"
                    >
                        Connect
                    </button>
                )}
            </div>
        </header>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <div className="flex min-h-dvh flex-col">
                <Header />
                <main className="flex flex-1 flex-col items-center py-8 px-4">
                    <Routes>
                        <Route path="/" element={<Navigate to="/borrow" replace />} />
                        <Route path="/borrow" element={<BorrowPage />} />
                        <Route path="/lend" element={<LendPage />} />
                        <Route path="/leverage" element={<LeveragePage />} />
                        <Route path="/portfolio" element={<PortfolioPage />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}
