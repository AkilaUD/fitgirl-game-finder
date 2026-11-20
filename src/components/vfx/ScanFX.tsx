import { motion, AnimatePresence } from 'motion/react';

export function ScanFX({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="scan-fx"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: 'inherit',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '140%',
              height: '140%',
              marginLeft: '-70%',
              marginTop: '-70%',
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(0,255,234,0.12) 40deg, transparent 80deg)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}