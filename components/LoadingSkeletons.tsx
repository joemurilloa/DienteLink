import React from 'react';

// Base skeleton component with shimmer animation
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded ${className}`} />
);

// Patient card skeleton
export const PatientCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-16 h-6 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <Skeleton className="h-3 w-16 mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-1" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  </div>
);

// Appointment card skeleton
export const AppointmentCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-11 h-11 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="w-12 h-6 rounded-full" />
    </div>
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  </div>
);

// Dashboard stats skeleton
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
  </div>
);

// Booking request skeleton
export const BookingRequestSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="w-20 h-6 rounded-full" />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>

    <div className="mb-4 p-3 bg-slate-50 rounded-xl">
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>

    <div className="flex gap-3">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 flex-1 rounded-xl" />
    </div>
  </div>
);

// Simple list item skeleton
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 animate-in fade-in duration-300">
    <Skeleton className="w-11 h-11 rounded-lg" />
    <div className="flex-1">
      <Skeleton className="h-4 w-32 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="w-6 h-6 rounded" />
  </div>
);

// Calendar day skeleton
export const CalendarDaySkeleton: React.FC = () => (
  <div className="p-2 border border-slate-300 rounded-lg min-h-[100px]">
    <Skeleton className="h-4 w-6 mb-2" />
    <div className="space-y-1">
      <Skeleton className="h-2 w-full rounded" />
      <Skeleton className="h-2 w-3/4 rounded" />
    </div>
  </div>
);

// Search result skeleton
export const SearchResultSkeleton: React.FC = () => (
  <div className="p-3 hover:bg-slate-50 rounded-xl border-b border-slate-300 last:border-b-0 animate-in fade-in duration-300">
    <div className="flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-12 h-5 rounded" />
    </div>
  </div>
);

// Loading state wrapper for any content
export const LoadingWrapper: React.FC<{
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}> = ({ isLoading, skeleton, children }) => {
  return isLoading ? <>{skeleton}</> : <>{children}</>;
};

// Generate multiple skeleton items
export const generateSkeletons = (SkeletonComponent: React.FC, count: number) => {
  return Array.from({ length: count }, (_, index) => (
    <SkeletonComponent key={`skeleton-${index}`} />
  ));
};

export default {
  PatientCardSkeleton,
  AppointmentCardSkeleton,
  StatsCardSkeleton,
  BookingRequestSkeleton,
  ListItemSkeleton,
  CalendarDaySkeleton,
  SearchResultSkeleton,
  LoadingWrapper,
  generateSkeletons,
};