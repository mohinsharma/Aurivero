from fastapi import APIRouter, HTTPException
from backend.app.models import ReplayDecisionRequest, StandardAPIResponse

# Pre-compiled verified scenarios matching frontend dataset
REPLAY_SCENARIOS = {
    "covid-crash-2020": {
        "id": "covid-crash-2020",
        "title": "March 2020: The COVID-19 Circuit Breaker Crash",
        "period": "Feb 2020 — Nov 2020",
        "benchmark": "NIFTY 50",
        "checkpoints": [
            {"index": 0, "date": "15 Feb 2020", "nifty": 12113, "headline": "Dalal Street Trades Near Record Highs", "what_happened_next": "Within 3 weeks, global infection rates exploded. Italy locked down northern provinces, and the first confirmed community transmissions appeared in India."},
            {"index": 1, "date": "06 Mar 2020", "nifty": 10989, "headline": "RBI Imposes Moratorium on Yes Bank; FIIs Sell Aggressively", "what_happened_next": "The WHO declared COVID-19 a worldwide pandemic on March 11. Global sovereign bond yields plummeted as investors rushed into cash."},
            {"index": 2, "date": "23 Mar 2020", "nifty": 7610, "headline": "Dalal Street Frozen in 45 Minutes: 10% Lower Circuit Halted", "what_happened_next": "Just 4 trading sessions later, the US Federal Reserve launched an open-ended quantitative easing program, and the Indian government announced emergency credit lines."},
            {"index": 3, "date": "30 Apr 2020", "nifty": 9859, "headline": "NIFTY Surges 30% from March Trough Driven by Global Liquidity", "what_happened_next": "The market defied pessimists. Major blue chips like TCS, Infosys, and Reliance announced blockbuster digital contracts and debt reduction milestones."},
            {"index": 4, "date": "10 Nov 2020", "nifty": 12631, "headline": "NIFTY Hits New All-Time High of 12,631 on Vaccine Breakthrough", "what_happened_next": "The bull market accelerated through 2021, eventually touching 18,600 by October 2021."}
        ]
    },
    "lehman-gfc-2008": {
        "id": "lehman-gfc-2008",
        "title": "2008 Global Financial Crisis: The Great Deleveraging",
        "period": "Jan 2008 — Jun 2009",
        "benchmark": "NIFTY 50",
        "checkpoints": [
            {"index": 0, "date": "08 Jan 2008", "nifty": 6287, "headline": "Reliance Power IPO Draws Record Bids; Sensex Crosses 21,000", "what_happened_next": "Within 10 days, French bank Societe Generale uncovered a rogue trading scandal, and global funds began aggressively unwinding carry trades."},
            {"index": 1, "date": "21 Jan 2008", "nifty": 5208, "headline": "Black Monday: Trading Halted as Sensex Plunges 2,000 Points", "what_happened_next": "The US Federal Reserve made an unscheduled emergency 75 bps interest rate cut between meetings to arrest liquidity freezing."},
            {"index": 2, "date": "15 Sep 2008", "nifty": 4038, "headline": "Lehman Brothers Collapses in Largest Bankruptcy in History", "what_happened_next": "AIG required an $85 Billion emergency bailout from the US government to avert immediate insolvency."},
            {"index": 3, "date": "27 Oct 2008", "nifty": 2524, "headline": "NIFTY Sinks to 2,524 — Down 60% from Peak; P/E Plunges to 11x", "what_happened_next": "Governments across the G20 coordinated interest rate reductions and massive fiscal infrastructure packages."},
            {"index": 4, "date": "18 May 2009", "nifty": 4321, "headline": "Election Miracle: UPA Mandate Triggers 20% Upper Circuit", "what_happened_next": "Global stimulus packages took hold, compounding emerging market equities for the subsequent decade."}
        ]
    }
}

router = APIRouter(prefix="/api/replay", tags=["Historical Market Replay"])

@router.get("/scenarios", response_model=StandardAPIResponse)
def get_scenarios():
    scenarios_list = list(REPLAY_SCENARIOS.values())
    return StandardAPIResponse(success=True, data={"scenarios": scenarios_list})

@router.post("/decision", response_model=StandardAPIResponse)
def advance_decision(req: ReplayDecisionRequest):
    scenario = REPLAY_SCENARIOS.get(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Historical scenario not found.")

    checkpoints = scenario["checkpoints"]
    cur_idx = req.checkpoint_index
    if cur_idx >= len(checkpoints):
        raise HTTPException(status_code=400, detail="Checkpoint index exceeds scenario range.")

    cur_cp = checkpoints[cur_idx]
    is_complete = (cur_idx >= len(checkpoints) - 1)
    next_idx = min(cur_idx + 1, len(checkpoints) - 1)
    next_cp = checkpoints[next_idx]

    # Calculate portfolio adjustment
    cur_price = cur_cp["nifty"]
    user_cash = req.user_cash
    user_units = req.user_units

    if req.action_id == "AGGRESSIVE_BUY":
        deploy = user_cash * 0.5
        user_units += (deploy / cur_price)
        user_cash -= deploy
    elif req.action_id == "MODERATE_BUY":
        deploy = user_cash * 0.2
        user_units += (deploy / cur_price)
        user_cash -= deploy
    elif req.action_id == "REDUCE_EXPOSURE":
        sold = user_units * 0.35
        user_cash += (sold * cur_price)
        user_units -= sold
    elif req.action_id == "PANIC_EXIT":
        user_cash += (user_units * cur_price)
        user_units = 0.0

    new_portfolio_val = user_cash + (user_units * next_cp["nifty"])

    return StandardAPIResponse(
        success=True,
        data={
            "next_checkpoint_index": next_idx,
            "what_happened_next": cur_cp["what_happened_next"],
            "new_nifty_price": next_cp["nifty"],
            "updated_cash": round(user_cash, 2),
            "updated_units": round(user_units, 4),
            "updated_portfolio_value": round(new_portfolio_val, 2),
            "is_scenario_complete": is_complete
        }
    )
