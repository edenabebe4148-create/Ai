import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Eye, EyeOff, LayoutGrid, ChevronDown, Check } from "lucide-react";
import { UserAccount } from "../types";

// Custom SVGs for Social Logins matching mockup
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.81-2.5-2.81-4.48-5.34-4.48h.15z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5 fill-slate-900" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.16.67-2.88 1.48-.62.72-1.16 1.87-1.01 2.97 1.1.09 2.24-.58 2.9-1.39z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5 fill-none stroke-slate-700 stroke-[1.8]" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.622c0-1.171.949-2.14 2.14-2.14H6.55c.487 0 .937.26 1.17.683l1.583 2.85c.22.395.14.887-.19 1.216l-1.082 1.082a10.536 10.536 0 004.754 4.754l1.082-1.082a.896.896 0 011.216-.19l2.85 1.583c.423.23.683.68.683 1.17v2.038c0 1.19-.97 2.14-2.14 2.14H15.75a13.5 13.5 0 01-13.5-13.5V6.622z"
    />
  </svg>
);

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

  const handleSocialLogin = (platform: string) => {
    // Elegant shortcut to auto-login for standard user experience
    const demoUser: UserAccount = {
      name: `${platform} User`,
      email: `demo.${platform.toLowerCase()}@chatterly.com`,
      isAuthenticated: true,
    };
    onAuthSuccess(demoUser);
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Simulating successful verification code triggering
    setAuthFlowType("signup");
    setScreen("verify");
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    setAuthFlowType("signup");
    setScreen("verify");
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
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-y-auto font-sans transition-colors duration-300" id="auth-workflow-viewport">
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
                  WesAiChat <ChevronDown className="w-4 h-4 stroke-[2.5]" />
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

              {/* Divider and social options */}
              <div className="my-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                  <span className="absolute px-3 bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-500 text-xs font-bold transition-colors">OR</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Google")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <GoogleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Apple")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <AppleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Phone")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <PhoneIcon />
                  </button>
                </div>
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
                  WesAiChat <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2 font-display">
                  Create your account 🚀
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  It only takes a minute to get started.
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                {/* Full Name Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your Name"
                    className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Email Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Password Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative">
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
                      className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
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
              <div className="text-center text-sm text-slate-500 mt-6 font-normal">
                Already have an account?{" "}
                <button
                  onClick={() => setScreen("signin")}
                  className="text-[#FF4D4D] font-bold hover:underline"
                >
                  Sign in
                </button>
              </div>

              {/* Divider and social options */}
              <div className="my-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-100"></div>
                  <span className="absolute px-3 bg-white text-slate-400 text-xs font-bold">OR</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Google")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <GoogleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Apple")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <AppleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Phone")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <PhoneIcon />
                  </button>
                </div>
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
                  WesAiChat <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2 font-display">
                  Enter Verification Code
                </h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed px-4">
                  We've sent an OTP code to <strong className="text-slate-700 font-semibold">{email}</strong> <br />
                  <span className="text-xs text-slate-400 font-normal">(It may take a few seconds to arrive.)</span>
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
                          ? "bg-red-50/50 border-[#FF4D4D] text-[#FF4D4D] font-extrabold"
                          : digit !== ""
                          ? "bg-slate-50 border-slate-200 text-slate-800"
                          : "bg-slate-50/70 border-slate-100 text-slate-400"
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
              <div className="text-center text-sm text-slate-500 mt-6 font-normal">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={() => alert("Verification code resent successfully!")}
                  className="text-[#FF4D4D] font-bold hover:underline"
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
                <button className="p-1 text-slate-600 hover:text-slate-800 cursor-pointer">
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <span className="text-slate-900 font-extrabold text-lg font-display">
                  WesAiChat
                </span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-4 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2 font-display">
                  Account Created 🎉
                </h2>
                <p className="text-slate-400 text-sm mt-1 px-4 leading-relaxed">
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
                  WesAiChat <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2 font-display">
                  Forgot your password?
                </h2>
                <p className="text-slate-400 text-sm mt-1 px-4 leading-relaxed">
                  Enter the email linked to your account and we'll send you a reset code.
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {/* Email Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
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
              <div className="text-center text-sm text-slate-500 mt-6 font-normal">
                Remember it now?{" "}
                <button
                  type="button"
                  onClick={() => setScreen("signin")}
                  className="text-[#FF4D4D] font-bold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>

              {/* Divider and social options */}
              <div className="my-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-100"></div>
                  <span className="absolute px-3 bg-white text-slate-400 text-xs font-bold">OR</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Google")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <GoogleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Apple")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <AppleIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("Phone")}
                    className="flex items-center justify-center p-3.5 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <PhoneIcon />
                  </button>
                </div>
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
                  WesAiChat <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-6 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2 font-display">
                  Create New Password
                </h2>
                <p className="text-slate-400 text-sm mt-1 px-4 leading-relaxed">
                  Enter a new Password you will remember
                </p>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {/* New Password Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative">
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
                      className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Block */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative">
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
                      className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
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
              <div className="text-center text-sm text-slate-500 mt-6 font-normal">
                Back to{" "}
                <button
                  type="button"
                  onClick={() => setScreen("signin")}
                  className="text-[#FF4D4D] font-bold hover:underline"
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
                <button className="p-1 text-slate-600 hover:text-slate-800 cursor-pointer">
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <span className="text-[#FF4D4D] font-extrabold text-lg font-display">
                  WesAiChat
                </span>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Central Title */}
              <div className="my-4 text-center">
                <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2 font-display">
                  Password Updated 🔐
                </h2>
                <p className="text-slate-400 text-sm mt-2 px-4 leading-relaxed">
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
        <div className="text-center text-xs text-slate-400 mt-8 font-medium">
          <a href="#" className="hover:text-slate-600 transition-colors">Terms of use</a>
          <span className="mx-2 text-slate-200">|</span>
          <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
        </div>

      </div>
    </div>
  );
}
