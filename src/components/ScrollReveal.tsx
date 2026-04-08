import { motion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

interface ScrollRevealProps {
  children: ReactNode
  direction?: Direction
  delay?: number
  duration?: number
  className?: string
  once?: boolean
}

const getVariants = (direction: Direction, distance = 40): Variants => {
  const hidden: Record<string, number> = { opacity: 0 }
  if (direction === 'up') hidden.y = distance
  if (direction === 'down') hidden.y = -distance
  if (direction === 'left') hidden.x = distance
  if (direction === 'right') hidden.x = -distance

  return {
    hidden,
    visible: { opacity: 1, x: 0, y: 0 },
  }
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className,
  once = true,
}: ScrollRevealProps) {
  return (
    <motion.div
      variants={getVariants(direction)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ staggerChildren: staggerDelay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  direction = 'up',
}: {
  children: ReactNode
  className?: string
  direction?: Direction
}) {
  return (
    <motion.div
      variants={getVariants(direction, 30)}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
