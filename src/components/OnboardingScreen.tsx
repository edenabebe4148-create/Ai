import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Bot, MessageSquare, Zap, Cpu } from "lucide-react";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Meet Your Smarter Assistant",
      description: "Chat with your AI companion—designed to help you think, plan, create, and explore faster than ever.",
      // Using the high-fidelity 3D robot illustration generated based on the Figma reference
      image: "/src/assets/images/onboarding_robot_illustration_1784331623560.jpg",
      isCustomGraphic: false,
    },
    {
      title: "Explore Specialist Personas",
      description: "Choose specialized AI agents tailored for coding (Devo), creative writing (Lyra), or technical interview practice (Zara).",
      isCustomGraphic: true,
      graphic: (
        <div className="relative flex items-center justify-center w-full h-full max-w-xs mx-auto">
          {/* Animated Aura */}
          <div className="absolute w-56 h-56 rounded-full bg-indigo-500/10 blur-2xl animate-pulse"></div>
          
          {/* Persona Bubbles layout */}
          <div className="relative grid grid-cols-2 gap-4 w-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center"
            >
              <span className="text-2xl mb-1">💻</span>
              <span className="text-xs font-bold text-slate-100 font-display">Devo</span>
              <span className="text-[9px] text-emerald-400 font-mono">Elite Coder</span>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center"
            >
              <span className="text-2xl mb-1">✍️</span>
              <span className="text-xs font-bold text-slate-100 font-display">Lyra</span>
              <span className="text-[9px] text-rose-400 font-mono">Creative Writer</span>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center"
            >
              <span className="text-2xl mb-1">🌍</span>
              <span className="text-xs font-bold text-slate-100 font-display">Kai</span>
              <span className="text-[9px] text-amber-400 font-mono">Linguist Tutor</span>
            </motion.div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center"
            >
              <span className="text-2xl mb-1">🎯</span>
              <span className="text-xs font-bold text-slate-100 font-display">Zara</span>
              <span className="text-[9px] text-cyan-400 font-mono">Interviewer</span>
            </motion.div>
          </div>
        </div>
      ),
    },
    {
      title: "Multimodal Powerhouse",
      description: "Analyze photos, dictate text using your voice, read aloud responses, and tap the magic wand to enhance prompts instantly.",
      isCustomGraphic: true,
      graphic: (
        <div className="relative flex flex-col items-center justify-center w-full h-full max-w-xs mx-auto space-y-4">
          <div className="absolute w-56 h-56 rounded-full bg-purple-500/10 blur-2xl animate-pulse"></div>

          {/* Prompt Enhancer Visual Card */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex items-center gap-3"
          >
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-100">AI Prompt Enhancer</span>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Transforms simple inputs into polished expert queries.</p>
            </div>
          </motion.div>

          {/* Multimodal Card */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex items-center gap-3"
          >
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-100">Vision & Speech Enabled</span>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Direct image analysis, voice-to-text, and TTS read-alouds.</p>
            </div>
          </motion.div>
        </div>
      ),
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-100 font-sans select-none overflow-hidden transition-colors duration-300" id="onboarding-viewport">
      {/* Top Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full flex flex-col items-center text-center space-y-6 md:space-y-8"
            id={`onboarding-slide-${currentSlide}`}
          >
            {/* Visual Header Illustration Box */}
            <div className="w-full aspect-square max-w-[280px] md:max-w-[320px] flex items-center justify-center relative bg-transparent rounded-2xl overflow-hidden">
              {slides[currentSlide].isCustomGraphic ? (
                slides[currentSlide].graphic
              ) : (
                <img
                  src={slides[currentSlide].image}
                  alt={slides[currentSlide].title}
                  className="w-full h-full object-contain pointer-events-none rounded-2xl"
                  referrerPolicy="no-referrer"
                  id="robot-illustration-img"
                />
              )}
            </div>

            {/* Typography Content Container */}
            <div className="space-y-3 px-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
                {slides[currentSlide].title}
              </h2>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation bar */}
      <div className="px-6 pb-12 pt-4 max-w-lg mx-auto w-full flex flex-col items-center space-y-6">
        {/* Progress dots */}
        <div className="flex items-center gap-2" id="onboarding-dots-container">
          {slides.map((_, index) => (
            <span
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentSlide ? "w-6 bg-[#FF4D4D]" : "w-2.5 bg-slate-200 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-800"
              }`}
              id={`onboarding-dot-${index}`}
            />
          ))}
        </div>

        {/* Action button row */}
        <div className="flex items-center gap-4 w-full">
          {/* Skip button */}
          <button
            onClick={onComplete}
            className="flex-1 py-4 text-sm font-bold text-[#FF4D4D] bg-[#FEF2F2] dark:bg-red-500/10 rounded-2xl active:bg-[#FEE2E2] dark:active:bg-red-500/20 transition-colors cursor-pointer text-center shadow-xs"
            id="onboarding-skip-btn"
          >
            Skip
          </button>

          {/* Next/Get Started button */}
          <button
            onClick={handleNext}
            className="flex-1 py-4 text-sm font-bold text-white bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] rounded-2xl transition-colors cursor-pointer text-center shadow-lg shadow-[#FF4D4D]/20"
            id="onboarding-next-btn"
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
