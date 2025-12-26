const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Stable booking management overview</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">Total Bookings</h3>
            <p className="text-2xl font-bold mt-2">245</p>
            <p className="text-sm text-green-600 mt-1">+12% from last month</p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">Active Stables</h3>
            <p className="text-2xl font-bold mt-2">18</p>
            <p className="text-sm text-green-600 mt-1">+2 new this month</p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">Revenue</h3>
            <p className="text-2xl font-bold mt-2">$12,540</p>
            <p className="text-sm text-green-600 mt-1">+18% from last month</p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">Occupancy Rate</h3>
            <p className="text-2xl font-bold mt-2">87%</p>
            <p className="text-sm text-green-600 mt-1">+5% from last month</p>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <p className="text-muted-foreground">Dashboard widgets will be integrated here</p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
