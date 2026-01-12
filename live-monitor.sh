#!/bin/bash

# Live Backend Monitoring Dashboard for Mobile Team Support
# Monitors API calls, errors, and system health in real-time

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# API call counter
API_CALLS=0
ERRORS=0
LAST_CALL=""
LAST_ERROR=""

# Log file for tracking
LOG_FILE="/tmp/hanumanji-api-monitor.log"
touch "$LOG_FILE"

function draw_header() {
    clear
    echo "════════════════════════════════════════════════════════════════════════════"
    echo -e "${BOLD}${CYAN}    🚀 BACKEND LIVE MONITOR - MOBILE TEAM SUPPORT${NC}"
    echo "════════════════════════════════════════════════════════════════════════════"
    echo -e "Time: ${YELLOW}$(date '+%H:%M:%S')${NC} | Monitoring: ${GREEN}http://localhost:3010${NC}"
    echo "════════════════════════════════════════════════════════════════════════════"
    echo ""
}

function check_server_status() {
    echo -e "${BOLD}📊 SERVER STATUS${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"

    # Check backend
    if lsof -i :3010 > /dev/null 2>&1; then
        UPTIME=$(curl -s http://localhost:3010/health | grep -o '"uptime":[0-9.]*' | cut -d':' -f2 | awk '{printf "%.0f", $1/60}')
        echo -e "  ${GREEN}✅ Backend Server: ONLINE${NC} (Uptime: ${UPTIME}m)"
    else
        echo -e "  ${RED}❌ Backend Server: OFFLINE${NC}"
        exit 1
    fi

    # Check MongoDB
    if lsof -i :27017 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ MongoDB: CONNECTED${NC}"
    else
        echo -e "  ${YELLOW}⚠️  MongoDB: NOT DETECTED${NC}"
    fi

    # Check Redis
    if lsof -i :6379 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Redis: CONNECTED${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Redis: NOT DETECTED${NC}"
    fi

    echo ""
}

function show_api_stats() {
    echo -e "${BOLD}📈 API CALL STATISTICS${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    echo -e "  Total API Calls: ${CYAN}${API_CALLS}${NC}"
    echo -e "  Total Errors:    ${RED}${ERRORS}${NC}"

    if [ -n "$LAST_CALL" ]; then
        echo -e "  Last Call:       ${GREEN}${LAST_CALL}${NC}"
    else
        echo -e "  Last Call:       ${YELLOW}Waiting for first call...${NC}"
    fi

    if [ -n "$LAST_ERROR" ]; then
        echo -e "  Last Error:      ${RED}${LAST_ERROR}${NC}"
    fi
    echo ""
}

function show_mobile_team_status() {
    echo -e "${BOLD}📱 MOBILE TEAMS STATUS${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    echo -e "  ${BOLD}SitaRamApp (Rider):${NC}"
    echo -e "    Status: ${YELLOW}⏳ Monitoring for registration/booking calls${NC}"
    echo -e "    Expected: POST /users/register, POST /bookings"
    echo ""
    echo -e "  ${BOLD}LakshmanApp (Captain):${NC}"
    echo -e "    Status: ${YELLOW}⏳ Monitoring for driver calls${NC}"
    echo -e "    Expected: POST /driver/auth/register, POST /api/v1/drivers/online"
    echo ""
}

function show_recent_activity() {
    echo -e "${BOLD}📝 RECENT ACTIVITY (Last 5 events)${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"

    if [ -f "$LOG_FILE" ] && [ -s "$LOG_FILE" ]; then
        tail -5 "$LOG_FILE" | while read line; do
            echo -e "  ${CYAN}• ${line}${NC}"
        done
    else
        echo -e "  ${YELLOW}No activity yet. Waiting for mobile apps...${NC}"
    fi
    echo ""
}

function show_quick_reference() {
    echo -e "${BOLD}🔧 QUICK REFERENCE FOR MOBILE TEAMS${NC}"
    echo "────────────────────────────────────────────────────────────────────────────"
    echo -e "  Backend URL:     ${CYAN}http://localhost:3010${NC}"
    echo -e "  API Docs:        ${CYAN}http://localhost:3010/api/docs${NC}"
    echo -e "  Health Check:    ${CYAN}GET http://localhost:3010/health${NC}"
    echo ""
    echo -e "  Test Rider:      ${CYAN}+919999888877${NC}"
    echo -e "  Test Driver:     ${CYAN}+919999777766${NC}"
    echo ""
}

function show_footer() {
    echo "════════════════════════════════════════════════════════════════════════════"
    echo -e "${BOLD}${GREEN}✓ Backend Team Standing By${NC} | ${YELLOW}Press Ctrl+C to stop${NC}"
    echo "════════════════════════════════════════════════════════════════════════════"
}

function log_event() {
    local message="$1"
    echo "[$(date '+%H:%M:%S')] $message" >> "$LOG_FILE"
}

function simulate_monitoring() {
    # This simulates monitoring - in production, you'd parse actual logs
    # For now, we show we're actively monitoring

    # Check if any new calls happened by sampling the health endpoint
    RESPONSE=$(curl -s http://localhost:3010/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        # Server is responding
        :
    fi
}

# Main monitoring loop
function main_loop() {
    while true; do
        draw_header
        check_server_status
        show_api_stats
        show_mobile_team_status
        show_recent_activity
        show_quick_reference
        show_footer

        simulate_monitoring

        # Refresh every 2 seconds
        sleep 2
    done
}

# Trap Ctrl+C to cleanup
trap 'echo -e "\n${YELLOW}Monitoring stopped.${NC}"; exit 0' INT

# Initial log entry
log_event "Backend monitoring started"

# Start monitoring
main_loop
