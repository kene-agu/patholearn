import { Microscope, Sparkles, BookOpen, Brain } from "lucide-react";

const features = [
  {
    icon: Microscope,
    title: "AI Slide Analysis",
    desc: "Upload any histology slide and get instant expert-level analysis",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: Sparkles,
    title: "Smart Annotations",
    desc: "Key structures highlighted with arrows and educational labels",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: BookOpen,
    title: "Deep Learning Context",
    desc: "Stain identification, risk factors, complications & differentials",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Brain,
    title: "Interactive Quizzes",
    desc: "Test your knowledge with adaptive quiz and flashcard modes",
    color: "bg-amber-50 text-amber-600",
  },
];

export default function Hero() {
  return (
    <div className="mb-10 text-center">
      <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
        <Sparkles className="w-4 h-4" />
        AI-Powered Visual Learning
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-3">
        Master Histopathology with AI
      </h1>
      <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-10">
        Upload a slide or choose from our library. PathoLearn&apos;s AI will
        identify structures, annotate key features, and guide your learning
        step by step.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {features.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card text-left hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">{title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
