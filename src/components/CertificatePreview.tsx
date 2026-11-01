import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Award, BadgeCheck, ShieldCheck } from 'lucide-react'
import type { Certificate, Course } from '../types'
import { formatDate } from '../lib/domain'
import { cx } from './ui'

export function CertificatePreview({
  certificate,
  course,
  learnerName,
}: {
  certificate: Certificate
  course: Course
  learnerName: string
}) {
  const verifyUrl = `https://verify.career-180.example/${certificate.id}`
  const stateStyles =
    certificate.state === 'Verified'
      ? 'border-emerald-700/25 bg-emerald-50 text-emerald-800'
      : certificate.state === 'Legacy'
        ? 'border-amber-700/25 bg-amber-50 text-amber-800'
        : 'border-sky-700/25 bg-sky-50 text-sky-800'

  return (
    <div className="overflow-hidden rounded-2xl border border-[#c9a45c]/45 bg-[#fdfbf5] text-[#15213a] shadow-[0_26px_80px_rgba(0,0,0,0.32)]">
      <div className="h-2 bg-gradient-to-r from-[#102a4c] via-[#2967a8] to-[#c9a45c]" />
      <div className="relative px-5 py-6 sm:px-9 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #173b6b 1px, transparent 0), radial-gradient(circle at 22px 22px, #c9a45c 1px, transparent 0)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="pointer-events-none absolute left-3 top-3 h-16 w-16 rounded-tl-xl border-l-2 border-t-2 border-[#c9a45c]/35 sm:left-4 sm:top-4" />
        <div className="pointer-events-none absolute bottom-3 right-3 h-16 w-16 rounded-br-xl border-b-2 border-r-2 border-[#c9a45c]/35 sm:bottom-4 sm:right-4" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#102a4c] to-[#1f548f] shadow-md">
              <span className="font-display text-base font-bold tracking-tight text-[#f7e7bd]">C</span>
            </span>
            <div>
              <div className="font-display text-[17px] font-bold tracking-[-0.03em] text-[#102a4c]">
                Career-180
              </div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.26em] text-[#8b7547]">
                Verified learning
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[#d9ccb0] bg-white/70 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#7a6a49] sm:inline-flex">
              <ShieldCheck className="h-3 w-3 text-[#1f548f]" />
              Official certificate
            </span>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full border-2 border-[#c9a45c] bg-[#fff8e7] text-[#9b762d] shadow-sm">
              <Award className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="relative mt-7 text-center sm:mt-8">
          <div className="text-[9px] font-bold uppercase tracking-[0.34em] text-[#a27f3d]">
            Certificate of completion
          </div>
          <div className="mt-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#7c8799]">
            This is to certify that
          </div>
          <div className="certificate-serif mt-2 text-[34px] leading-tight tracking-[-0.02em] text-[#102a4c] sm:text-[44px]">
            {learnerName}
          </div>
          <div className="mx-auto mt-3 h-px w-44 bg-gradient-to-r from-transparent via-[#c9a45c] to-transparent" />
          <div className="mt-3 text-[10px] leading-5 text-[#667286] sm:text-[11px]">
            has successfully completed the Career-180 course
          </div>
          <div className="mt-1.5 font-display text-xl font-semibold leading-snug tracking-[-0.02em] text-[#173b6b] sm:text-[23px]">
            {course.name}
          </div>
          <div className="mt-4 flex justify-center">
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.13em]',
                stateStyles,
              )}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {certificate.state === 'Verified'
                ? 'Completed & Verified'
                : certificate.state === 'Legacy'
                  ? 'Legacy completion'
                  : 'Course completed'}
            </span>
          </div>
        </div>

        <div className="relative mt-7 grid gap-5 border-t border-[#e2dac7] pt-5 sm:mt-8 sm:grid-cols-[1fr_132px] sm:items-end">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9a8b6a]">
                Issue date
              </div>
              <div className="mt-1 text-[12px] font-semibold text-[#263852]">
                {formatDate(certificate.issuedAt)}
              </div>
            </div>
            <div>
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9a8b6a]">
                Certificate ID
              </div>
              <div className="mt-1 font-mono text-[12px] font-bold tracking-[0.08em] text-[#263852]">
                {certificate.id}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9a8b6a]">
                Issued by
              </div>
              <div className="certificate-serif mt-1 text-[17px] text-[#173b6b]">Career-180 Learning</div>
              <div className="mt-0.5 text-[8px] text-[#8b95a5]">
                Registered in the Career-180 certificate registry
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 sm:items-end">
            <div className="rounded-xl border border-[#d8d0bf] bg-white p-2 shadow-sm">
              <QRCodeSVG value={verifyUrl} size={88} level="M" fgColor="#173b6b" bgColor="#ffffff" />
            </div>
            <div className="text-center text-[7px] font-bold uppercase tracking-[0.16em] text-[#8b95a5] sm:text-right">
              Scan to verify
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-1 bg-[#102a4c] px-5 py-2.5 text-[8px] font-medium tracking-[0.06em] text-[#d9e3ef] sm:flex-row sm:px-9">
        <span>Career-180 · Professional certificate</span>
        <span className="text-[#e5ca91]">verify.career-180.example</span>
      </div>
    </div>
  )
}

export function SegmentedInput({
  length,
  value,
  onChange,
  onComplete,
}: {
  length: number
  value: string
  onChange: (value: string) => void
  onComplete: (value: string) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const normalize = (raw: string) => {
    const matches = raw.match(/[0-9]/g) ?? []
    return matches.join('').slice(0, length)
  }
  const setAt = (index: number, char: string) => {
    const chars = value.padEnd(length, ' ').split('')
    chars[index] = char || ' '
    const next = chars.join('').replace(/\s/g, '').slice(0, length)
    onChange(next)
    return next
  }
  const handleChange = (index: number, raw: string) => {
    const clean = normalize(raw)
    if (!clean) {
      setAt(index, '')
      return
    }
    let next = value
    const chars = value.split('')
    for (let cursor = 0; cursor < clean.length && index + cursor < length; cursor += 1) {
      chars[index + cursor] = clean[cursor]
      next = chars.join('').slice(0, length)
    }
    onChange(next)
    const focusAt = Math.min(index + clean.length, length - 1)
    refs.current[focusAt]?.focus()
    if (next.length === length) onComplete(next)
  }
  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      event.preventDefault()
      const next = setAt(index - 1, '')
      if (next.length === length) onComplete(next)
      refs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      refs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      refs.current[index + 1]?.focus()
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      onComplete(value)
    }
  }
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = normalize(event.clipboardData.getData('text'))
    if (!pasted) return
    onChange(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
    if (pasted.length === length) onComplete(pasted)
  }

  return (
    <div className="mx-auto flex w-full max-w-[390px] items-center gap-2 sm:gap-2.5">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element
          }}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          aria-label={`Character ${index + 1} of ${length}`}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={1}
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-[#080a11] text-center font-mono text-lg font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-[#738dff]/80 focus:bg-[#0b0e1a] focus:ring-2 focus:ring-[#738dff]/20 sm:h-14 sm:text-xl"
        />
      ))}
    </div>
  )
}
