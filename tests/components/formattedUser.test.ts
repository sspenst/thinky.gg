import FormattedUser from '@root/components/formatted/formattedUser';
import User from '@root/models/db/user';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

jest.mock('react-dom/server', () => ({
  ...jest.requireActual('react-dom/server'),
  renderToStaticMarkup: () => '',
}));

describe('FormattedUser', () => {
  it('renders the deleted-user fallback for an empty projected user', () => {
    const markup = renderToString(createElement(FormattedUser, {
      id: 'deleted-user',
      user: {} as User,
    }));

    expect(markup).toContain('[deleted]');
  });
});
