export const seaLevel = -9
export const riverPoints: [number, number, number][] = [[-22, -39, 1.4], [-4, -34, 0.4], [17, -30, 0], [29, -23, -0.6], [32, -9, -1.5], [34, 9, -3], [39, 23, -6], [38, 32, seaLevel]]

export function terrainHeight(x: number, z: number): number {
  const outside = Math.max(Math.abs(x) - 25, Math.abs(z) - 23, 0)
  const blend = Math.min(outside / 15, 1)
  const coast = -Math.max(x - 25, 0) * 0.43 - Math.max(z - 28, 0) * 0.19
  const peak = (px: number, pz: number, height: number, width: number) => height * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / width ** 2)
  const hills = peak(-39, -32, 8, 14) + peak(-55, -51, 17, 13) + peak(-72, -68, 25, 15) + peak(-19, -78, 16, 13)
  const cape = peak(42, -22, 8, 14)
  const contours = Math.sin(x * 0.075 + z * 0.035) * 1.3 + Math.sin(z * 0.11) * 0.7
  // ponytail: agent navigation stays flat; terrain outside the work area is scenery only.
  const ground = blend * blend * (3 - 2 * blend) * (coast + hills + cape + contours)
  if (outside === 0) return ground
  const channel = riverChannel(x, z)
  const cut = Math.max(0, 1 - Math.max(0, channel.distance - 1.6) / 2.4)
  return ground + (Math.min(ground, channel.height - 0.35) - ground) * cut
}

export function riverChannel(x: number, z: number): { distance: number; height: number } {
  let distance = Infinity, height = seaLevel
  for (let i = 1; i < riverPoints.length; i++) {
    const [ax, az, ay] = riverPoints[i - 1], [bx, bz, by] = riverPoints[i]
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)))
    const d = Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t)
    if (d < distance) { distance = d; height = ay + (by - ay) * t }
  }
  return { distance, height }
}

export function coastX(z: number): number {
  let left = 25, right = 190
  for (let i = 0; i < 24; i++) {
    const middle = (left + right) / 2
    if (terrainHeight(middle, z) > seaLevel) left = middle
    else right = middle
  }
  return (left + right) / 2
}
