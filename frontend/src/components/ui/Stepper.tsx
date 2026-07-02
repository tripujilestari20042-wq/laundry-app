'use client';

import { Check } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;

          return (
            <li
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex flex-col items-center min-w-[4rem]">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    done
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : active
                        ? 'border-primary-600 text-primary-600 bg-primary-50 scale-110'
                        : 'border-slate-200 text-slate-400 bg-white'
                  }`}
                >
                  {done ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <p className={`mt-2 text-xs font-medium text-center ${active ? 'text-primary-700' : 'text-slate-500'}`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-6 rounded transition-colors duration-300 ${
                    done ? 'bg-primary-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
