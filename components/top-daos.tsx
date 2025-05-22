"use client"

import { useState, useEffect } from "react"
import { Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useFirebase } from "./firebase-provider"

interface DAO {
  id: string
  name: string
  description: string
  logo: string
  memberCount: number
}

export function TopDAOs() {
  const { isInitialized } = useFirebase()
  const [daos, setDaos] = useState<DAO[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isInitialized) {
      // In a real app, this would be fetched from Firebase
      setSampleDAOs()
    }
  }, [isInitialized])

  const setSampleDAOs = () => {
    setIsLoading(true)
    // Sample data
    const sampleDaos: DAO[] = [
      {
        id: "1",
        name: "peaq network",
        description: "Powering the Economy of Things",
        logo: "/images/dao-1.png",
        memberCount: 5881,
      },
      {
        id: "2",
        name: "Ten (formerly Obscuro)",
        description: "Encrypting Ethereum",
        logo: "/images/dao-2.png",
        memberCount: 5543,
      },
      {
        id: "3",
        name: "Olive Finance",
        description: "LYF Made Easy",
        logo: "/images/dao-3.png",
        memberCount: 3056,
      },
      {
        id: "4",
        name: "ZetaChain",
        description: "Simple, Fast, and Secure Omnichain Blockchain.",
        logo: "/images/dao-4.png",
        memberCount: 2954,
      },
      {
        id: "5",
        name: "Nation3 DAO",
        description: "We are building a zero-tax, Web3-powered, solarpunk society.",
        logo: "/images/dao-5.png",
        memberCount: 1918,
      },
    ]
    setDaos(sampleDaos)
    setIsLoading(false)
  }

  const filteredDaos = daos.filter(
    (dao) =>
      dao.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dao.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-full bg-blue-600 h-6 w-6">
            <span className="text-white text-sm">🌐</span>
          </span>
          Top DAOs ({daos.length})
        </h1>
        <p className="text-muted-foreground">
          Find hundreds of web3 DAOs, see their roadmap and explore open bounties and work
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search DAOs..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredDaos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No DAOs found matching your search criteria</div>
        ) : (
          filteredDaos.map((dao) => (
            <Card
              key={dao.id}
              className="hover:bg-secondary/10 transition-colors border-secondary/20 dark:border-gray-700"
            >
              <CardContent className="flex items-center p-4 gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={dao.logo || "/placeholder.svg"} alt={dao.name} />
                  <AvatarFallback>{dao.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium dark:text-white">{dao.name}</h3>
                  <p className="text-sm text-muted-foreground">{dao.description}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{dao.memberCount.toLocaleString()} members</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
