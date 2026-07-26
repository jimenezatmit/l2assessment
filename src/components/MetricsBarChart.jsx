import { useState } from 'react'

const WIDTH = 600
const HEIGHT = 240
const BASELINE_Y = 180
const BAR_AREA_HEIGHT = 140
const MAX_BAR_WIDTH = 24
const CORNER_RADIUS = 4

function barPath(x, width, top, baseline) {
  const height = baseline - top
  const r = Math.max(0, Math.min(CORNER_RADIUS, height / 2))
  return `
    M ${x} ${baseline}
    L ${x} ${top + r}
    Q ${x} ${top} ${x + r} ${top}
    L ${x + width - r} ${top}
    Q ${x + width} ${top} ${x + width} ${top + r}
    L ${x + width} ${baseline}
    Z
  `
}

function MetricsBarChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const max = Math.max(...data.map(d => d.value), 1)
  const bandWidth = WIDTH / data.length

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      className="w-full h-auto"
      role="img"
      aria-label="Bar chart of dashboard metrics"
    >
      <line
        x1={0}
        y1={BASELINE_Y}
        x2={WIDTH}
        y2={BASELINE_Y}
        stroke="#e5e7eb"
        strokeWidth={1}
      />

      {data.map((d, i) => {
        const barHeight = (d.value / max) * BAR_AREA_HEIGHT
        const top = BASELINE_Y - barHeight
        const barWidth = Math.min(MAX_BAR_WIDTH, bandWidth - 8)
        const x = i * bandWidth + (bandWidth - barWidth) / 2
        const isActive = activeIndex === i

        return (
          <g
            key={d.label}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex(null)}
            tabIndex={0}
          >
            {/* larger invisible hit target than the bar itself */}
            <rect
              x={i * bandWidth}
              y={0}
              width={bandWidth}
              height={HEIGHT}
              fill="transparent"
            />
            <path
              d={barPath(x, barWidth, top, BASELINE_Y)}
              fill={d.color}
              opacity={isActive ? 0.75 : 1}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </path>
            <text
              x={x + barWidth / 2}
              y={top - 8}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill="#374151"
            >
              {d.value}
            </text>
            <text
              x={i * bandWidth + bandWidth / 2}
              y={BASELINE_Y + 20}
              textAnchor="middle"
              fontSize={10.5}
              fill="#6b7280"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default MetricsBarChart
