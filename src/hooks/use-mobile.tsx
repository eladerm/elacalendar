import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const checkIsMobile = () => {
      setIsMobile(mql.matches);
    }

    checkIsMobile();
    
    if (mql.addEventListener) {
      mql.addEventListener('change', checkIsMobile);
    } else {
      mql.addListener(checkIsMobile);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', checkIsMobile);
      } else {
        mql.removeListener(checkIsMobile);
      }
    }
  }, [])

  return isMobile
}
