import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export const fetcher = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url.startsWith('/') ? url : `/${url}`}`
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }

  return response.json()
}
