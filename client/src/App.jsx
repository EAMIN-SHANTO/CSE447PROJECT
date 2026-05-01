import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Homepage from "./routes/Homepage";
import AdminDashboard from "./routes/AdminDashboard";
import Layout from "./routes/Layout";
import Login from "./routes/Login";
import Inbox from "./routes/Inbox";
import MyBids from "./routes/MyBids";
import MyListings from "./routes/MyListings";
import PostDetail from "./routes/PostDetail";
import PostEditor from "./routes/PostEditor";
import Profile from "./routes/Profile";
import Register from "./routes/Register";
import TransactionConfirmation from "./routes/TransactionConfirmation";

const App = () => (
  <Router>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/posts/new"
          element={
            <ProtectedRoute>
              <PostEditor />
            </ProtectedRoute>
          }
        />
        <Route path="/posts/:slug" element={<PostDetail />} />
        <Route
          path="/posts/:slug/edit"
          element={
            <ProtectedRoute>
              <PostEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-listings"
          element={
            <ProtectedRoute>
              <MyListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bids"
          element={
            <ProtectedRoute>
              <MyBids />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/:bidId"
          element={
            <ProtectedRoute>
              <TransactionConfirmation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={["admin", "staff"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <div className="min-h-[60vh] flex items-center justify-center px-4">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-slate-900">404</h1>
                <p className="text-slate-600 mt-2">Page not found</p>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  </Router>
);

export default App;