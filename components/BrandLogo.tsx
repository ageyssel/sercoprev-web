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
    <Link href={href} className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6ad4d]" aria-label="SERCOPREV">
      <span className={`relative block ${compact ? 'h-9 w-32' : 'h-12 w-44'}`}>
        <Image src="/logo.png" alt="SERCOPREV" fill priority className={`object-contain object-left ${inverse ? 'brightness-0 invert' : ''}`} />
      </span>
    </Link>
  )
}
