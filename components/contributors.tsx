"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Info, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useFirebase } from "./firebase-provider"

interface Contributor {
  id: string
  name: string
  avatar: string
  reputation: number
  description: string
}

export function Contributors() {
  const { isInitialized } = useFirebase()
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  useEffect(() => {
    if (isInitialized) {
      // In a real app, this would be fetched from Firebase
      setSampleContributors()
    }
  }, [isInitialized])

  const setSampleContributors = () => {
    setIsLoading(true)
    // Sample data
    const sampleContributors: Contributor[] = [
      {
        id: "1",
        name: "Sero | Hunters Workshop",
        avatar: "/images/contributor-1.png",
        reputation: 11340,
        description: "Software Engineer | Web3 | Podcaster - Fluent in English, Arabic and French",
      },
      {
        id: "2",
        name: "ifun",
        avatar: "/images/contributor-2.png",
        reputation: 10092,
        description: "DAO Operations Contributor. Graphics, Content and Template Creator. Data Entry",
      },
      {
        id: "3",
        name: "Zaff",
        avatar: "/images/contributor-3.png",
        reputation: 8150,
        description: "Community Operations & Management | DAO Tooling | Content & Communications",
      },
      {
        id: "4",
        name: "sagitario",
        avatar: "/images/contributor-4.png",
        reputation: 4750,
        description: "Polyglot fluent in English, German and Portuguese. I help DAOs and crypto projects",
      },
      {
        id: "5",
        name: "hamzat_iii",
        avatar: "/images/contributor-5.png",
        reputation: 4209,
        description: "Technical and Content Writing → Content Creation → Analysis → Social Media",
      },
      {
        id: "6",
        name: "scagria",
        avatar: "/images/contributor-6.png",
        reputation: 3800,
        description: "Crypto Enthusiast",
      },
      {
        id: "7",
        name: "v3dant.eth",
        avatar: "/images/contributor-7.png",
        reputation: 1750,
        description: "Indian web3 enthusiast specializing in operations, translation and IRL meetups",
      },
      {
        id: "8",
        name: "tnrdd",
        avatar: "/images/contributor-8.png",
        reputation: 1400,
        description: "Full Stack Developer",
      },
      {
        id: "9",
        name: "Latsan",
        avatar: "/images/contributor-9.png",
        reputation: 1300,
        description: "Onchain Analyst",
      },
    ]
    setContributors(sampleContributors)
    setIsLoading(false)
  }

  const totalPages = Math.ceil(contributors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContributors = contributors.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contributors</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentContributors.map((contributor) => (
              <Card key={contributor.id} className="bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contributor.avatar || "/placeholder.svg"} alt={contributor.name} />
                      <AvatarFallback>{contributor.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{contributor.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>Reputation: {contributor.reputation}</span>
                        <Info className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{contributor.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show current page and up to 2 pages before and after
                const pageNumToShow = Math.min(Math.max(currentPage - 2 + i, 1), totalPages)
                return (
                  pageNumToShow <= totalPages && (
                    <Button
                      key={pageNumToShow}
                      variant={currentPage === pageNumToShow ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(pageNumToShow)}
                    >
                      {pageNumToShow}
                    </Button>
                  )
                )
              })}

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
