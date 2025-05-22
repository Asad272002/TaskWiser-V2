"use client"

import { useState, useEffect } from "react"
import { useFirebase } from "./firebase-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2 } from "lucide-react"
import type { Bounty } from "@/lib/types"

export function BountiesList() {
  const { getBounties, isInitialized } = useFirebase()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [filteredBounties, setFilteredBounties] = useState<Bounty[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  // Update the useEffect to depend on isInitialized
  useEffect(() => {
    if (isInitialized) {
      console.log("Firebase is initialized, fetching bounties...")
      fetchBounties()
    } else {
      console.log("Firebase not initialized yet, waiting...")
    }
  }, [isInitialized])

  useEffect(() => {
    filterBounties()
  }, [bounties, searchQuery, categoryFilter])

  const fetchBounties = async () => {
    setIsLoading(true)
    try {
      // Check if Firebase is initialized before fetching
      if (!isInitialized) {
        console.log("Firebase not yet initialized, using sample data")
        setSampleBountiesData()
        return
      }

      console.log("Attempting to fetch bounties from Firebase...")
      const data = await getBounties()
      console.log(`Fetched ${data?.length || 0} bounties from Firebase`)

      if (data && data.length > 0) {
        setBounties(data)
      } else {
        console.log("No bounties found in Firebase, using sample data")
        // If no data returned, use sample data
        setSampleBountiesData()
      }
    } catch (error) {
      console.error("Error fetching bounties:", error)
      // Use sample data on error
      setSampleBountiesData()
    } finally {
      setIsLoading(false)
    }
  }

  // Add a new function to set sample bounties data
  const setSampleBountiesData = () => {
    const sampleBounties: Bounty[] = [
      {
        id: "1",
        title: "[X Thread or Long Post] How to Get Discord Roles",
        description: "Create a comprehensive guide on Discord roles",
        daoName: "NodeShift",
        daoImage: "/images/dao-1.png",
        reward: "USDC",
        rewardAmount: 15,
        category: "Writing",
        daysAgo: 13,
      },
      {
        id: "2",
        title: "[Video] Create Community Onboarding Video",
        description: "Create an onboarding video for new community members",
        daoName: "NodeShift",
        daoImage: "/images/dao-2.png",
        reward: "USDC",
        rewardAmount: 25,
        category: "Video",
        daysAgo: 15,
      },
      {
        id: "3",
        title: "[Translation] NodeShift Whitepaper",
        description: "Translate the NodeShift whitepaper to another language",
        daoName: "NodeShift",
        daoImage: "/images/dao-3.png",
        reward: "USDC",
        rewardAmount: 30,
        category: "Translation",
        daysAgo: 15,
      },
      {
        id: "4",
        title: "Join community",
        description: "Join our community and participate in discussions",
        daoName: "XTOM",
        daoImage: "/images/dao-4.png",
        reward: "BNB",
        rewardAmount: 1,
        category: "Community",
        daysAgo: 21,
      },
    ]

    setBounties(sampleBounties)
  }

  const filterBounties = () => {
    let filtered = [...bounties]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (bounty) =>
          bounty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bounty.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bounty.daoName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((bounty) => bounty.category === categoryFilter)
    }

    setFilteredBounties(filtered)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Open Bounties</h1>
        <p className="text-muted-foreground">Find and explore tasks and bounties across hundreds of DAOs</p>
      </div>

      {!isInitialized ? (
        <div className="flex h-40 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Initializing Firebase...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Writing">Writing</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Translation">Translation</SelectItem>
                <SelectItem value="Community">Community</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">ALL BOUNTIES</h2>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredBounties.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">No bounties found matching your criteria</p>
              </div>
            ) : (
              filteredBounties.map((bounty) => (
                <Card key={bounty.id} className="overflow-hidden">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12 rounded-full">
                      <AvatarImage src={bounty.daoImage || "/placeholder.svg"} alt={bounty.daoName} />
                      <AvatarFallback>{bounty.daoName.substring(0, 2)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-medium">{bounty.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {bounty.daysAgo} days ago by {bounty.daoName}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className="rounded-sm bg-secondary/50 text-xs font-normal">
                          {bounty.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                        <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">
                          {bounty.rewardAmount} {bounty.reward}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        $
                        {bounty.reward === "USDC"
                          ? bounty.rewardAmount
                          : bounty.reward === "BNB"
                            ? bounty.rewardAmount * 500
                            : 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
