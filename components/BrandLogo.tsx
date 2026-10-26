import Image from 'next/image'
import Link from 'next/link'

export function BrandLogo({
  href = '/',
  compact = false,
  inverse = false,
}: {
  href?: string
  compact?: boolean
  inverse?: boolean
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b49b73]" aria-label="SERCOPREV">
      <span className={`relative block shrink-0 ${compact ? 'h-14 w-32' : 'h-20 w-48'} ${inverse ? 'bg-white p-1' : ''}`}>
        <Image src="/sercoprev-logo-oficial.webp" alt="SERCOPREV" fill priority className="object-contain object-center" />
      </span>
    </Link>
  )
}
