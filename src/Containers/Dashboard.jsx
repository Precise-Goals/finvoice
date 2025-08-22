import LineChart from "../Components/LineChart";
import PieCha0rt from "../Components/PieChar";

const Dashboard = () => {
  return (
    <div className="conte">
      <div className="DashStart">
        <div className="dashc">
          <p>Total Balance • All time</p>
          <h1>₹ 54000.00</h1>
        </div>
        <div className="spending">
          <p>Spendings</p>
          <h1>₹ 3224.00</h1>
        </div>
      </div>
      <div className="lineChar">
        <div className="ldiv"></div>
        <h5>August Savings</h5>
        <LineChart />
      </div>
      <div className="Piechar">
        <PieCha0rt />
      </div>
    </div>
  );
};

export default Dashboard;
