import './src/notification/gateways/slack.gateway';

jest.mock('./src/notification/gateways/slack.gateway', () => ({
  SlackGateway: jest.fn().mockImplementation(() => ({
    sendCronTriggerNotification: jest.fn().mockResolvedValue(undefined),
  })),
}));
