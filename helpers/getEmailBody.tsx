//* istanbul ignore file */

import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnrichedLevel } from '../models/db/level';
import User from '../models/db/user';
import { getGameFromId } from './getGameIdFromReq';

// good place to test the output:
// https://htmlemail.io/inline/

interface EmailBodyProps {
  featuredLevelsLabel?: string;
  featuredLevels?: EnrichedLevel[];
  gameId: GameId;
  linkHref?: string;
  linkText?: string;
  message?: string;
  notificationsCount?: number;
  title: string;
  user: User;
}

export default function getEmailBody({
  gameId,
  featuredLevelsLabel,
  featuredLevels,
  linkHref,
  linkText,
  message,
  notificationsCount = 0,
  title,
  user,
}: EmailBodyProps) {
  const game = Games[gameId];

  return renderToStaticMarkup(
    <html>
      <body>
        <table role='presentation' cellPadding='0' cellSpacing='0' style={{
          backgroundColor: '#FFF',
          borderCollapse: 'separate',
          fontFamily: 'sans-serif',
          width: '100%',
        }}>
          <tr>
            <td align='center' style={{
              display: 'block',
              padding: 20,
              verticalAlign: 'top',
            }}>
              <table role='presentation' cellPadding='0' cellSpacing='0' style={{
                color: '#000',
                maxWidth: 580,
                width: '100%'
              }}>
                <tr>
                  <td>
                    <div style={{
                      borderColor: '#BBB',
                      borderRadius: 20,
                      borderStyle: 'solid',
                      borderWidth: 1,
                      padding: 20,
                      textAlign: 'center',
                    }}>
                      <a href={`${game.baseUrl}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${game.baseUrl}${game.logoPfp}`} width='64' alt={game.displayName} />
                      </a>
                      <h1>Hi {user.name},</h1>
                      <p style={{
                        fontSize: '20px',
                      }}>{title}</p>
                      {notificationsCount > 0 && (
                        <p>You have <a href={game.baseUrl + '/notifications?source=email-digest&filter=unread'} style={{
                          color: '#4890ce',
                          textDecoration: 'none',
                        }}>{notificationsCount} unread notification{notificationsCount !== 1 ? 's' : ''}</a></p>
                      )}
                      {message && (
                        <p>{message}</p>
                      )}
                      {linkHref && linkText &&
                        <a
                          href={linkHref}
                          style={{
                            margin: '0 auto',
                            backgroundColor: 'rgb(96 165 250)',
                            borderRadius: 4,
                            color: '#FFF',
                            display: 'inline-block',
                            padding: '10px 20px',
                            textDecoration: 'none',
                          }}
                        >
                          {linkText}
                        </a>
                      }
                      {featuredLevels &&
                        <div>
                          <h2 style={{
                            margin: '20px 0',
                          }}>
                            {featuredLevelsLabel}
                          </h2>
                          <table role='presentation' cellPadding='0' cellSpacing='0' style={{
                            width: '100%',
                          }}>
                            {featuredLevels.filter(level => level).map((level) => (
                              <tr key={level._id.toString()}>
                                <td>
                                  <div style={{
                                    textAlign: 'center',
                                  }}>
                                    <table role='presentation' cellPadding='0' cellSpacing='0' style={{
                                      margin: '16px auto',
                                    }}>
                                      <tr>
                                        <td style={{
                                          lineHeight: 0,
                                        }}>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img style={{ marginRight: 8 }} src={`${Games[level.gameId].baseUrl}${Games[level.gameId].logoPng}`} width='24' alt={Games[level.gameId].displayName} />
                                        </td>
                                        <td style={{
                                          fontSize: 16,
                                        }}>
                                          <a href={getGameFromId(level.gameId).baseUrl} style={{
                                            color: '#4890ce',
                                            fontSize: 16,
                                            textDecoration: 'none',
                                          }}>
                                            {Games[level.gameId].displayName}
                                          </a>
                                        </td>
                                      </tr>
                                    </table>
                                    <div style={{
                                      margin: 16,
                                    }}>
                                      <a href={`${getGameFromId(level.gameId).baseUrl}/level/${level.slug}`} style={{
                                        color: '#4890ce',
                                        textDecoration: 'none',
                                      }}>
                                        {level.name}
                                      </a>
                                      {' by '}
                                      <a href={`${getGameFromId(level.gameId).baseUrl}/profile/${encodeURI(level.userId.name)}`} style={{
                                        color: '#4890ce',
                                        textDecoration: 'none',
                                      }}>
                                        {level.userId.name}
                                      </a>
                                    </div>
                                    <div style={{
                                      margin: 16,
                                    }}>
                                      <a href={`${getGameFromId(level.gameId).baseUrl}/level/${level.slug}`} style={{
                                        color: '#4890ce',
                                        textDecoration: 'none',
                                      }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={`${getGameFromId(level.gameId).baseUrl}/api/level/image/${level._id}.png`} width='100%' alt={level.name} />
                                      </a>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </table>
                        </div>
                      }
                      <p>
                        Thanks for playing <a href={`${game.baseUrl}`} style={{
                          color: '#4890ce',
                          textDecoration: 'none',
                        }}>{game.displayName}</a>!
                      </p>
                      <div id='footer' style={{
                        fontSize: '10px',
                        color: '#999',
                        textAlign: 'center',
                      }}>
                        <p>Join the <a href='https://discord.gg/kpfdRBt43v' style={{
                          color: '#4890ce',
                          textDecoration: 'none',
                        }}>Thinky.gg Discord</a> to chat with other players and the developers!</p>
                        <p><a href={`${game.baseUrl}/settings#notifications`} style={{
                          color: '#4890ce',
                          textDecoration: 'none',
                        }}>Manage your email notification settings</a></p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
