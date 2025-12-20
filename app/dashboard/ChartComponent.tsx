'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ChartComponentProps {
  labels: string[];
  data: number[];
}

export default function ChartComponent({ labels, data }: ChartComponentProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Create new chart
    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Hours Focused',
            data: data,
            backgroundColor: '#38bdf8',
            borderRadius: 4,
            hoverBackgroundColor: '#7dd3fc',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#e2e8f0',
            bodyColor: '#38bdf8',
            displayColors: false,
            callbacks: {
              label: (context) => `${parseFloat(context.parsed.y.toString()).toFixed(1)} hrs`,
            },
          },
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' },
          },
        },
      } as ChartOptions<'bar'>,
    });

    // Cleanup
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [labels, data]);

  return <canvas ref={chartRef}></canvas>;
}
