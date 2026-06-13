import { mockDesigners, mockPortfolioItems } from "@/lib/mock/designers";
import { mockJobs, mockPayments } from "@/lib/mock/jobs";
import {
  mockAiBriefs,
  mockDesignRequests,
  mockDesignerMatches,
} from "@/lib/mock/requests";

export function getMockDesignRequests() {
  return mockDesignRequests;
}

export function getMockDesignRequestById(requestId: string) {
  return mockDesignRequests.find((request) => request.id === requestId) ?? null;
}

export function getMockAiBriefByRequestId(requestId: string) {
  return mockAiBriefs.find((brief) => brief.requestId === requestId) ?? null;
}

export function getMockDesigners() {
  return mockDesigners;
}

export function getMockDesignerById(designerId: string) {
  return mockDesigners.find((designer) => designer.id === designerId) ?? null;
}

export function getMockPortfolioByDesignerId(designerId: string) {
  return mockPortfolioItems.filter((item) => item.designerId === designerId);
}

export function getMockPortfolioItems() {
  return mockPortfolioItems;
}

export function getMockDesignerMatchesByRequestId(requestId: string) {
  return mockDesignerMatches
    .filter((match) => match.requestId === requestId)
    .map((match) => {
      const designer = getMockDesignerById(match.designerId);
      const portfolios = match.matchedPortfolioIds
        .map((portfolioId) =>
          mockPortfolioItems.find((portfolio) => portfolio.id === portfolioId),
        )
        .filter(Boolean);

      return {
        ...match,
        designer,
        portfolios,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getMockJobs() {
  return mockJobs;
}

export function getMockJobById(jobId: string) {
  return mockJobs.find((job) => job.id === jobId) ?? null;
}

export function getMockPaymentByJobId(jobId: string) {
  return mockPayments.find((payment) => payment.jobId === jobId) ?? null;
}

export function getMockDataSummary() {
  return {
    designers: mockDesigners.length,
    portfolioItems: mockPortfolioItems.length,
    requests: mockDesignRequests.length,
    aiBriefs: mockAiBriefs.length,
    matches: mockDesignerMatches.length,
    jobs: mockJobs.length,
    payments: mockPayments.length,
  };
}