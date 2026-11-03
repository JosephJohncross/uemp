import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'

interface SearchInputProps {
  onSearch: (value: string) => void
  placeholder?: string
}

export function SearchInput({ onSearch, placeholder = 'Search…' }: SearchInputProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), 300)
    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}
