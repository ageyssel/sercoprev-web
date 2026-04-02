// app/components/SubmitButton.tsx
'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton({ text, loadingText, className }: { text: string, loadingText: string, className?: string }) {
  const { pending } = useFormStatus()
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className={`relative flex justify-center items-center overflow-hidden transition-all duration-300 ${pending ? 'opacity-70 cursor-not-allowed scale-[0.98]' : 'hover:scale-[1.02] active:scale-95'} ${className}`}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </span>
      ) : text}
    </button>
  )
}