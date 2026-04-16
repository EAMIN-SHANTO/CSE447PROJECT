import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./routes/Layout.jsx";
import Homepage from "./routes/Homepage.jsx";
import Login from "./routes/Login.jsx";
import Register from "./routes/Register.jsx";

const App = () => {
  console.log('App rendered');

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Each route should have its own unique component */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="*" element={
            <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600">Page not found</p>
              </div>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;