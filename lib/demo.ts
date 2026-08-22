import { addDays, iso, NOW } from './fixtures/clock'
import { WEIGH_IN_START_DATE } from './fixtures/fitness'

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/**
 * The real DREXIT_DATE is a fixed personal date and will eventually pass. For
 * the public demo that would leave the app's signature figure, the countdown
 * in the sidebar and the DREXIT_T tile, permanently reading zero. In demo
 * mode it rides ~10 months ahead of today instead.
 */
export const DEMO_DREXIT_DATE = iso(addDays(NOW, 304))

/**
 * The date the weight glide path is measured from. In demo mode that is the
 * first generated weigh-in, so the target line on the fitness chart starts
 * where the data actually starts.
 */
export const DEMO_WEIGHT_START_DATE = WEIGH_IN_START_DATE
