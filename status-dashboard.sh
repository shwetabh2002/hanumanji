#!/bin/bash

# Backend Status Dashboard
# Quick view of backend server status for mobile team support

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo "════════════════════════════════════════════════════════════════"
echo "${BOLD}    🚀 BACKEND STATUS DASHBOARD - MOBILE TEAM SUPPORT${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if backend is running
if lsof -i :3010 > /dev/null 2>&1; then
    echo "${GREEN}✅ Backend Server: RUNNING${NC}"
    echo "   URL: ${CYAN}http://localhost:3010${NC}"
    echo "   API Docs: ${CYAN}http://localhost:3010/api/docs${NC}"
else
    echo "${RED}❌ Backend Server: NOT RUNNING${NC}"
    echo "   Start with: ${YELLOW}npm run start:dev${NC}"
    exit 1
fi

echo ""

# Check MongoDB
if lsof -i :27017 > /dev/null 2>&1; then
    echo "${GREEN}✅ MongoDB: RUNNING${NC}"
else
    echo "${YELLOW}⚠️  MongoDB: NOT DETECTED${NC}"
fi

# Check Redis
if lsof -i :6379 > /dev/null 2>&1; then
    echo "${GREEN}✅ Redis: RUNNING${NC}"
else
    echo "${YELLOW}⚠️  Redis: NOT DETECTED${NC}"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "${BOLD}📱 TEST ACCOUNTS${NC}"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "${BOLD}Rider (SitaRamApp):${NC}"
echo "   Phone: ${CYAN}+919999888877${NC}"
echo "   User ID: ${CYAN}69600147c9d5810295bb4971${NC}"
echo ""
echo "${BOLD}Driver (LakshmanApp):${NC}"
echo "   Phone: ${CYAN}+919999777766${NC}"
echo "   Driver ID: ${CYAN}69600158c9d5810295bb4974${NC}"
echo ""

echo "────────────────────────────────────────────────────────────────"
echo "${BOLD}🔌 KEY ENDPOINTS${NC}"
echo "────────────────────────────────────────────────────────────────"
echo ""

# Test health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/health)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "${GREEN}✅${NC} GET  /health ${GREEN}(200 OK)${NC}"
else
    echo "${RED}❌${NC} GET  /health ${RED}(Error)${NC}"
fi

# Test API root
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "${GREEN}✅${NC} GET  / ${GREEN}(200 OK)${NC}"
else
    echo "${RED}❌${NC} GET  / ${RED}(Error)${NC}"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "${BOLD}📊 INTEGRATION STATUS${NC}"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "SitaRamApp (Rider):   ${YELLOW}⏳ Waiting for first API call${NC}"
echo "LakshmanApp (Captain): ${YELLOW}⏳ Waiting for first API call${NC}"
echo ""

echo "────────────────────────────────────────────────────────────────"
echo "${BOLD}📖 DOCUMENTATION${NC}"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "Integration Guide: ${CYAN}MOBILE_INTEGRATION_GUIDE.md${NC}"
echo "Support Summary:   ${CYAN}BACKEND_SUPPORT_SUMMARY.md${NC}"
echo "Monitor Script:    ${CYAN}node monitor-api.js${NC}"
echo ""

echo "────────────────────────────────────────────────────────────────"
echo "${BOLD}🎯 READY FOR INTEGRATION${NC}"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "Backend team is ${GREEN}standing by${NC} and monitoring."
echo "Mobile teams can begin integration now!"
echo ""
echo "Press ${YELLOW}Ctrl+C${NC} to exit"
echo ""

# Keep refreshing every 5 seconds
while true; do
    sleep 5
    # Clear and redraw (optional - comment out for static display)
    # clear
    # exec $0
done
