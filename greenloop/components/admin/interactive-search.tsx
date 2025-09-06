"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, X, Download } from "lucide-react"

interface FilterOption {
  key: string
  label: string
  values: string[]
}

interface InteractiveSearchProps {
  data: any[]
  onFilteredData: (filteredData: any[]) => void
  searchFields: string[]
  filterOptions: FilterOption[]
  placeholder?: string
  onExport?: () => void
}

export function InteractiveSearch({
  data,
  onFilteredData,
  searchFields,
  filterOptions,
  placeholder = "Search...",
  onExport,
}: InteractiveSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        searchFields.some((field) => {
          const value = getNestedValue(item, field)
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        }),
      )
    }

    // Apply active filters
    Object.entries(activeFilters).forEach(([filterKey, filterValues]) => {
      if (filterValues.length > 0) {
        filtered = filtered.filter((item) => {
          const value = getNestedValue(item, filterKey)
          return filterValues.includes(value?.toString() || "")
        })
      }
    })

    return filtered
  }, [data, searchTerm, activeFilters, searchFields])

  useEffect(() => {
    onFilteredData(filteredData)
  }, [filteredData, onFilteredData])

  // Helper function to get nested object values
  function getNestedValue(obj: any, path: string) {
    return path.split(".").reduce((current, key) => current?.[key], obj)
  }

  // Handle filter changes
  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    setActiveFilters((prev) => {
      const currentValues = prev[filterKey] || []
      if (checked) {
        return { ...prev, [filterKey]: [...currentValues, value] }
      } else {
        return { ...prev, [filterKey]: currentValues.filter((v) => v !== value) }
      }
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({})
    setSearchTerm("")
  }

  // Get active filter count
  const activeFilterCount = Object.values(activeFilters).flat().length

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative bg-transparent">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {filterOptions.map((option) => (
              <div key={option.key}>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  {option.label}
                </DropdownMenuLabel>
                {option.values.map((value) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={activeFilters[option.key]?.includes(value) || false}
                    onCheckedChange={(checked) => handleFilterChange(option.key, value, checked)}
                  >
                    {value}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
              </div>
            ))}

            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterKey, values]) =>
            values.map((value) => (
              <Badge key={`${filterKey}-${value}`} variant="secondary" className="gap-1">
                {value}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange(filterKey, value, false)} />
              </Badge>
            )),
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
            Clear All
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} results
        {searchTerm && ` for "${searchTerm}"`}
      </div>
    </div>
  )
}
