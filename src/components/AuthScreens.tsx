import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Eye, EyeOff, LayoutGrid, ChevronDown, Check } from "lucide-react";
import { UserAccount } from "../types";



interface AuthWorkflowProps {
  initialScreen?: "signin" | "signup" | "verify" | "created" | "forgot" | "reset-password" | "password-updated";
  onAuthSuccess: (user: UserAccount) => void;
  onClose: () => void;
}

export default function AuthWorkflow({
  initialScreen = "signin",
  onAuthSuccess,
  onClose,
}: AuthWorkflowProps) {
  const [screen, setScreen] = useState<"signin" | "signup" | "verify" | "created" | "forgot" | "reset-password" | "password-updated">(initialScreen);
  const [authFlowType, setAuthFlowType] = useState<"signup" | "forgot">("signup");
  
  // Registration / Login input state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("jude@gmail.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);

  // Reset Password input state
  const [newPassword, setNewPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("password123");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Verification code input
  const [otpCode, setOtpCode] = useState<string[]>(["8", "", "", ""]);
  const [activeOtpIndex, setActiveOtpIndex] = useState(1);



  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Direct easy success login
    const user: UserAccount = {
      name: email.split("@")[0] || "User",
      email: email,
      isAuthenticated: true,
    };
    onAuthSuccess(user);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    // Direct easy success sign up
    const newUser: UserAccount = {
      name: name,
      email: email,
      isAuthenticated: true,
    };
    onAuthSuccess(newUser);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authFlowType === "signup") {
      setScreen("created");
    } else {
      setScreen("reset-password");
    }
  };

  const handleCreatedContinue = () => {
    const newUser: UserAccount = {
      name: name || "Jude",
      email: email || "jude@gmail.com",
      isAuthenticated: true,
    };
    onAuthSuccess(newUser);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFlowType("forgot");
    setScreen("verify");
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setScreen("password-updated");
  };

  const handleOtpBoxChange = (val: string, index: number) => {
    if (val.length > 1) val = val.slice(-1);
    const updated = [...otpCode];
    updated[index] = val;
    setOtpCode(updated);

    // Auto focus next box if typed
    if (val && index < 3) {
      setActiveOtpIndex(index + 1);
    }
  };

  const handleOtpBoxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      setActiveOtpIndex(index - 1);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100 select-none overflow-y-auto font-sans transition-colors duration-300" id="auth-workflow-viewport">
      {/* Absolute top spacer representing mobile notch design */}
      <div className="w-full h-8 flex items-center justify-between px-6 py-2 text-xs font-semibold text-slate-800 dark:text-slate-350">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 fill-slate-800 dark:fill-slate-350" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.13 19.67 10.53 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
          <svg className="w-4 h-4 fill-slate-800 dark:fill-slate-350" viewBox="0 0 24 24"><path d="M22 8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8zm-2 8H4V8h16v8z"/></svg>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-6 pb-8 pt-4">
        
        {/* Animated screens using Framer Motion */}
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: SIGN IN */}
          {screen === "signin" && (
            <motion.div
              key="signin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-signin"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="flex items-center gap-1 text-[#FF4D4D] font-bold text-lg font-display cursor-pointer">
                  Wes Ai Studio <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Welcome back 👋
                </h2>
                <p className="text-slate-400 dark:text-slate-450 text-sm mt-1">
                  Sign in to continue your chat journey.
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                {/* Email Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Password Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl relative transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setScreen("forgot")}
                    className="text-slate-400 text-xs font-medium hover:text-[#FF4D4D] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Log in
                </button>
              </form>

              {/* Sign up Link */}
              <div className="text-center text-sm text-slate-500 mt-6 font-normal">
                Don't have an account?{" "}
                <button
                  onClick={() => setScreen("signup")}
                  className="text-[#FF4D4D] font-bold hover:underline"
                >
                  Create one
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: SIGN UP */}
          {screen === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-signup"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="flex items-center gap-1 text-[#FF4D4D] font-bold text-lg font-display cursor-pointer">
                  Wes Ai Studio <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Create your account 🚀
                </h2>
                <p className="text-slate-400 dark:text-slate-450 text-sm mt-1">
                  It only takes a minute to get started.
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Full Name Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your Name"
                    className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Email Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Password Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl relative transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password"
                      className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Create Account
                </button>
              </form>

              {/* Sign in Link */}
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 font-normal">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setScreen("signin")}
                  className="text-[#FF4D4D] font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: VERIFICATION CODE */}
          {screen === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-verify"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="flex items-center gap-1 text-[#FF4D4D] font-bold text-lg font-display cursor-pointer">
                  Wes Ai Studio <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Enter Verification Code
                </h2>
                <p className="text-slate-400 dark:text-slate-400 text-sm mt-2 leading-relaxed px-4">
                  We've sent an OTP code to <strong className="text-slate-700 dark:text-slate-300 font-semibold">{email}</strong> <br />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(It may take a few seconds to arrive.)</span>
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleVerifySubmit} className="space-y-8 my-6">
                
                {/* 4 interactive OTP fields matching Figma precisely */}
                <div className="flex items-center justify-center gap-4">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpBoxChange(e.target.value, index)}
                      onKeyDown={(e) => handleOtpBoxKeyDown(e, index)}
                      onFocus={() => setActiveOtpIndex(index)}
                      className={`w-16 h-16 text-center text-xl font-bold rounded-2xl border transition-all focus:outline-none ${
                        index === 0
                          ? "bg-red-50/50 dark:bg-red-500/10 border-[#FF4D4D] text-[#FF4D4D] font-extrabold"
                          : digit !== ""
                          ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          : "bg-slate-50/70 dark:bg-slate-900/70 border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-600"
                      }`}
                      id={`otp-box-${index}`}
                    />
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Verify
                </button>
              </form>

              {/* Resend Code Link */}
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 font-normal">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={() => alert("Verification code resent successfully!")}
                  className="text-[#FF4D4D] font-bold hover:underline cursor-pointer"
                >
                  Resend
                </button>
              </div>

              {/* Footer spacer */}
              <div className="h-12" />
            </motion.div>
          )}

          {/* SCREEN 4: ACCOUNT CREATED (SUCCESS SCREEN) */}
          {screen === "created" && (
            <motion.div
              key="created"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-created"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <span className="text-slate-900 dark:text-white font-extrabold text-lg font-display">
                  Wes Ai Studio
                </span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-4 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Account Created 🎉
                </h2>
                <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 px-4 leading-relaxed">
                  Thanks for joining! Let's explore what you can do.
                </p>
              </div>

              {/* Center Robot Illustration */}
              <div className="w-full aspect-square max-w-[260px] mx-auto flex items-center justify-center relative my-6">
                <img
                  src="/src/assets/images/account_created_robot_1784331904308.jpg"
                  alt="Account Created Robot"
                  className="w-full h-full object-contain pointer-events-none rounded-3xl"
                  referrerPolicy="no-referrer"
                  id="created-robot-illustration"
                />
              </div>

              {/* CTA Button */}
              <div className="space-y-4">
                <button
                  onClick={handleCreatedContinue}
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Continue
                </button>
              </div>

              {/* Spacer */}
              <div className="h-6" />
            </motion.div>
          )}

          {/* SCREEN 5: FORGOT PASSWORD */}
          {screen === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-forgot"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="flex items-center gap-1 text-[#FF4D4D] font-bold text-lg font-display cursor-pointer">
                  Wes Ai Studio <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Forgot your password?
                </h2>
                <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 px-4 leading-relaxed">
                  Enter the email linked to your account and we'll send you a reset code.
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {/* Email Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Send Reset Code
                </button>
              </form>

              {/* Back to Sign In Link */}
              {/* Sign in Link */}
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 font-normal">
                Remember it now?{" "}
                <button
                  type="button"
                  onClick={() => setScreen("signin")}
                  className="text-[#FF4D4D] font-bold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 6: CREATE NEW PASSWORD */}
          {screen === "reset-password" && (
            <motion.div
              key="reset-password"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-reset-password"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="flex items-center gap-1 text-[#FF4D4D] font-bold text-lg font-display cursor-pointer">
                  Wes Ai Studio <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Create New Password
                </h2>
                <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 px-4 leading-relaxed">
                  Enter a new Password you will remember
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {/* New Password Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl relative transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Block */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl relative transition-colors">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="flex items-center justify-between">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Continue
                </button>
              </form>

              {/* Back to Sign In option */}
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 font-normal">
                Back to{" "}
                <button
                  type="button"
                  onClick={() => setScreen("signin")}
                  className="text-[#FF4D4D] font-bold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 7: PASSWORD UPDATED (SUCCESS) */}
          {screen === "password-updated" && (
            <motion.div
              key="password-updated"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
              id="screen-password-updated"
            >
              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <button className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <span className="text-[#FF4D4D] font-extrabold text-lg font-display">
                  Wes Ai Studio
                </span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-4 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2 font-display">
                  Password Updated 🔐
                </h2>
                <p className="text-slate-400 dark:text-slate-400 text-sm mt-2 px-4 leading-relaxed">
                  Your password has been changed successfully. You can now sign in with your new one
                </p>
              </div>

              {/* Center Robot Illustration */}
              <div className="w-full aspect-square max-w-[260px] mx-auto flex items-center justify-center relative my-6">
                <img
                  src="/src/assets/images/account_created_robot_1784331904308.jpg"
                  alt="Password Updated Robot"
                  className="w-full h-full object-contain pointer-events-none rounded-3xl"
                  referrerPolicy="no-referrer"
                  id="updated-robot-illustration"
                />
              </div>

              {/* CTA Button */}
              <div className="space-y-4">
                <button
                  onClick={() => setScreen("signin")}
                  className="w-full py-4 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-[#FF4D4D]/15 cursor-pointer text-center"
                >
                  Sign In
                </button>
              </div>

              {/* Spacer */}
              <div className="h-6" />
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer sticky legal links precisely aligned */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 font-medium">
          <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms of use</a>
          <span className="mx-2 text-slate-200 dark:text-slate-800">|</span>
          <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
        </div>

      </div>
    </div>
  );
}
