import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import Home from "./Containers/Home";
import Dashboard from "./Containers/Dashboard";
import Chat from "./Containers/Chat";
import Goals from "./Containers/Goals";
import AgentWraper from "./Containers/AgentWraper";
import { app } from "./firebase";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { UserContext, useUser } from "./UserContext";
import LogUp from "./Containers/LogUp";
import Navbar from "./Components/Navbar";
import IntroAnimation from "./Components/IntroAnimation";
import { UsawerR } from "./Components/UsawerR";
import { Profile } from "./Components/Profile";

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading, signOut: () => signOut(getAuth(app)) };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// --- Private Route Wrapper ---
function PrivateRoute({ element }) {
  const { user, loading } = useUser();
  if (loading) return <div></div>;
  return user ? element : <Navigate to="/" replace />;
}

// --- Route Data ---
const routeData = [
  {
    route: "/",
    component: Home,
    private: false,
  },
  {
    route: "/dashboard",
    component: Dashboard,
    private: true,
  },
  {
    route: "/chat",
    component: Chat,
    private: true,
  },
  {
    route: "/goals",
    component: Goals,
    private: true,
  },
  {
    route: "/agent",
    component: AgentWraper,
    private: true,
  },
  {
    route: "/logup",
    component: LogUp,
    private: false,
  },
  {
    route: "/profile",
    component: Profile,
    private: true,
  },
];

function App() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <>
      {!introDone && <IntroAnimation onComplete={() => setIntroDone(true)} />}

      {introDone && (
        <div className="App">
          <div className="wrapper">
            <UserProvider>
              <BrowserRouter>
                <UsawerR />
                <div className="divsa"></div>

                <Navbar />
                <Routes>
                  {routeData.map((route, index) =>
                    route.private ? (
                      <Route
                        key={index}
                        path={route.route}
                        element={<PrivateRoute element={<route.component />} />}
                      />
                    ) : (
                      <Route
                        key={index}
                        path={route.route}
                        element={<route.component />}
                      />
                    )
                  )}
                  <Route path="*" element={<Home />} />
                </Routes>
              </BrowserRouter>
            </UserProvider>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
