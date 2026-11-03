// Standard Nigerian classification on the 5-point scale.
const CLASSES = [
  { min: 4.5, label: 'First Class' },
  { min: 3.5, label: 'Second Class Upper' },
  { min: 2.4, label: 'Second Class Lower' },
  { min: 1.5, label: 'Third Class' },
  { min: 1.0, label: 'Pass' },
]

export function classOfDegree(cgpa: number): string {
  return CLASSES.find((band) => cgpa >= band.min)?.label ?? 'Below pass'
}
