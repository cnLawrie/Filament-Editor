import { useState, RefObject, useEffect } from "react"


export const useScroll = (targetDom: RefObject<HTMLDivElement>, triggerPoints: number[]): boolean[] => {
    const [triggers, setTriggers] = useState<boolean[]>(new Array(triggerPoints.length))
    useEffect(() => {
        const dom = targetDom.current
        const handler = (e: any) => {
            const scrollTop = !!e.target && e.target.scrollTop;
            triggerPoints.forEach((point: number, index) => {
                if (scrollTop > point && !triggers[index]) {
                    const newTriggers: boolean[] = [...triggers]
                    newTriggers[index] = true
                    setTriggers(newTriggers)
                }
            })
        }
        !!dom && dom.addEventListener('scroll', handler)
        return () => {
            // cleanup
            !!dom && dom.removeEventListener('scroll', handler)
        };
    })

    return triggers
}