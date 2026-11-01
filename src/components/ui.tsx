import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Info, X } from 'lucide-react'
import type { CertificateState } from '../types'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'blue'
type ButtonSize = 'sm' | 'md' | 'lg'

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'border-transparent bg-gradient-to-r from-[#5478ff] to-[#a45dff] text-white shadow-[0_8px_30px_rgba(89,102,255,0.25)] hover:brightness-110',
    blue: 'border-transparent bg-[#2f74ff] text-white hover:bg-[#4381ff]',
    secondary:
      'border-white/10 bg-white/[0.055] text-slate-200 hover:border-white/20 hover:bg-white/[0.09]',
    ghost: 'border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white',
    danger:
      'border-red-400/20 bg-red-500/10 text-red-300 hover:border-red-400/35 hover:bg-red-500/15',
    success:
      'border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/35 hover:bg-emerald-500/15',
  }
  const sizes: Record<ButtonSize, string> = {
    sm: 'rounded-lg px-3 py-1.5 text-xs',
    md: 'rounded-xl px-4 py-2.5 text-sm',
    lg: 'rounded-xl px-5 py-3 text-sm',
  }
  return (
    <button
      className={cx(
        'focus-ring inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-[11px] bg-gradient-to-br from-[#6486ff] to-[#9d60ff] shadow-[0_6px_22px_rgba(108,111,255,0.28)]">
        <span className="absolute inset-[1px] rounded-[10px] border border-white/20" />
        <span className="font-display text-[13px] font-bold tracking-tight text-white">C</span>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#07080d] bg-emerald-400" />
      </span>
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-white">
          Career<span className="text-[#8b9dff]">-180</span>
        </span>
      )}
    </span>
  )
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-6xl px-4 sm:px-6', className)}>{children}</div>
}

export function Header({ route }: { route: string }) {
  const links = [
    { href: '#/verify', label: 'Verify', active: route === 'verify' || route === 'evidence' },
    { href: '#/learner', label: 'Learner', active: route === 'learner' },
  ]
  return (
    <header className="relative z-20 border-b border-white/[0.055]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#/verify" className="focus-ring rounded-lg" aria-label="Career-180 verify">
          <Logo />
        </a>
        <nav className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cx(
                'focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-[13px]',
                link.active
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-200',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </Container>
    </header>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 pb-7 pt-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8093ff]">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StateBadge({
  state,
  size = 'md',
  label,
}: {
  state: CertificateState
  size?: 'sm' | 'md'
  label?: string
}) {
  const styles: Record<CertificateState, string> = {
    Verified: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
    Completed: 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300',
    Legacy: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
    Revoked: 'border-red-400/20 bg-red-400/[0.08] text-red-300',
  }
  const dot: Record<CertificateState, string> = {
    Verified: 'bg-emerald-400',
    Completed: 'bg-sky-400',
    Legacy: 'bg-amber-400',
    Revoked: 'bg-red-400',
  }
  return (
    <span className={cx('pill', size === 'sm' ? 'px-2 py-0.5 text-[10px]' : '', styles[state])}>
      <span className={cx('h-1.5 w-1.5 rounded-full', dot[state])} />
      {label ?? state}
    </span>
  )
}

export function SourceBadge({ source }: { source: 'Self-directed' | 'Corporate-enrolled' }) {
  return (
    <span
      className={cx(
        'pill',
        source === 'Corporate-enrolled'
          ? 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300'
          : 'border-white/10 bg-white/[0.05] text-slate-300',
      )}
    >
      {source === 'Corporate-enrolled' ? 'Corporate-enrolled' : 'Self-directed'}
    </span>
  )
}

export function BandPill({ band }: { band: string }) {
  const style =
    band === 'Excellent'
      ? 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300'
      : band === 'Very good'
        ? 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300'
        : band === 'Good'
          ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
          : band === 'Not passed'
            ? 'border-red-400/20 bg-red-400/[0.08] text-red-300'
            : 'border-white/10 bg-white/[0.05] text-slate-400'
  return <span className={cx('pill whitespace-nowrap', style)}>{band}</span>
}

export function InfoPopover({
  title,
  children,
  label = 'More information',
  align = 'left',
}: {
  title: string
  children: ReactNode
  label?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring grid h-5 w-5 place-items-center rounded-full text-slate-500 transition hover:bg-white/[0.08] hover:text-[#a9b7ff]"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close information"
            onClick={() => setOpen(false)}
          />
          <span
            id={id}
            role="dialog"
            className={cx(
              'absolute top-7 z-40 w-72 rounded-xl border border-white/10 bg-[#11131d] p-4 text-left shadow-2xl',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-semibold text-white">
              {title}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
            <span className="block text-xs leading-5 text-slate-400">{children}</span>
          </span>
        </>
      )}
    </span>
  )
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
      <button className="fixed inset-0 cursor-default" onClick={onClose} aria-label="Close dialog" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-fade-up relative z-10 my-auto w-full rounded-3xl border border-white/[0.09] bg-[#0d0f18] shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
          <div>
            {eyebrow && (
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7f92ff]">
                {eyebrow}
              </div>
            )}
            <h2 className="font-display text-xl font-semibold tracking-tight text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">{description}</p>}
    </div>
  )
}

export function CheckTiny() {
  return (
    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
      <Check className="h-3 w-3" />
    </span>
  )
}

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

const ToastContext = createContext<{ pushToast: (message: string, tone?: ToastItem['tone']) => void } | null>(
  null,
)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }, [])
  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'animate-fade-up pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-xs shadow-2xl backdrop-blur-xl',
              toast.tone === 'success' &&
                'border-emerald-400/20 bg-[#0d1914]/95 text-emerald-100',
              toast.tone === 'error' && 'border-red-400/20 bg-[#1b0e11]/95 text-red-100',
              toast.tone === 'info' && 'border-[#8194ff]/20 bg-[#101323]/95 text-[#d5dbff]',
            )}
          >
            <span className="mt-0.5 h-1.5 w-1.5 flex-none rounded-full bg-current" />
            <span className="leading-5">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

export function DownloadLine({ label }: { label: string }) {
  return <span className="text-[11px] text-slate-500">{label}</span>
}
