import Dimensions from '@root/constants/dimensions';
import Level from '@root/models/db/level';
import MultiplayerMatch, { ChatMessage } from '@root/models/db/multiplayerMatch';
import User from '@root/models/db/user';
import React, { useEffect, useRef, useState } from 'react';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import FormattedUser from '../formatted/formattedUser';

interface MatchChatProps {
  match: MultiplayerMatch;
  user: User;
  onSendMessage: (message: string) => void;
  showSpectatorNotice?: boolean;
  connectedUsersCount?: number;
}

export default function MatchChat({ match, user, onSendMessage, showSpectatorNotice = false, connectedUsersCount }: MatchChatProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const justSentMessageRef = useRef(false);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const currentMessageCount = match.chatMessages?.length || 0;

    // Only scroll if message count actually increased
    if (currentMessageCount > prevMessageCountRef.current) {
      const container = messagesContainerRef.current;

      if (container) {
        // If we just sent a message, scroll immediately
        if (justSentMessageRef.current) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
          justSentMessageRef.current = false;
        } else {
          // For other people's messages, scroll with a slight delay to ensure rendering is complete
          setTimeout(() => {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
      }
    }

    prevMessageCountRef.current = currentMessageCount;
  }, [match.chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;
    
    // Don't send if we're alone in the room
    if (connectedUsersCount && connectedUsersCount <= 1) return;

    setIsSending(true);
    justSentMessageRef.current = true;
    await onSendMessage(message);
    setMessage('');
    setIsSending(false);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderSystemMessage = (chatMessage: ChatMessage) => {
    // Check if this is a level action system message
    if (chatMessage.systemData?.type === 'level_action' && chatMessage.systemData?.userId && chatMessage.systemData?.level) {
      const userId = chatMessage.systemData.userId;
      const userName = chatMessage.systemData.userName;
      const action = chatMessage.systemData.action;
      const level = match.levels.find(a => a._id === chatMessage.systemData.level) as Level;

      // Create a minimal user object for FormattedUser
      const systemUser = {
        _id: userId,
        name: userName,
      } as User;

      return (
        <div className='bg-white/5 border border-white/10 text-white/50 rounded-lg px-2 py-1 text-xs text-center max-w-[90%]'>
          <div className='font-normal flex items-center justify-center gap-1 flex-wrap'>
            <FormattedUser id={`chat-user-${userId}`} user={systemUser} size={Dimensions.AvatarSizeSmall} />
            <span>{action}</span>
            {level && <FormattedLevelLink level={level} id={`chat-level-${level._id}`} /> }
            <span className='text-white/30 text-[10px]'>• {formatTime(chatMessage.createdAt)}</span>
          </div>
        </div>
      );
    }

    // Check if this is a user action system message
    if (chatMessage.systemData?.type === 'user_action' && chatMessage.systemData?.userId) {
      const userId = chatMessage.systemData.userId;
      const userName = chatMessage.systemData.userName;
      const action = chatMessage.systemData.action;

      // Create a minimal user object for FormattedUser
      const systemUser = {
        _id: userId,
        name: userName,
      } as User;

      return (
        <div className='bg-white/5 border border-white/10 text-white/50 rounded-lg px-2 py-1 text-xs text-center max-w-[90%]'>
          <div className='font-normal flex items-center justify-center gap-1'>
            <FormattedUser id={`chat-user-${userId}`} user={systemUser} size={Dimensions.AvatarSizeSmall} />
            <span>{action}</span>
            <span className='text-white/30 text-[10px]'>• {formatTime(chatMessage.createdAt)}</span>
          </div>
        </div>
      );
    }

    // For other system messages, just show plain text
    return (
      <div className='bg-white/5 border border-white/10 text-white/50 rounded-lg px-2 py-1 text-xs text-center max-w-[90%]'>
        <div className='font-normal'>
          {chatMessage.message}
          <span className='text-white/30 text-[10px] ml-1'>• {formatTime(chatMessage.createdAt)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className='w-full sm:w-80 relative animate-fadeInUp' style={{ animationDelay: '0.8s' }}>
      <div className='absolute -inset-2 bg-gradient-to-r from-cyan-600/15 to-purple-600/15 blur-lg opacity-40' />
      <div className='relative bg-white/8 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 flex flex-col h-80'>
        {/* Header */}
        <div className='p-4 border-b border-white/20'>
          <h3 className='text-lg font-semibold text-white text-center'>
            Match Chat
          </h3>
          {showSpectatorNotice && (
            <p className='text-xs text-yellow-300 text-center mt-2'>
              Players won&apos;t see these messages until after the match
            </p>
          )}
        </div>
        {/* Messages */}
        <div ref={messagesContainerRef} className='flex-1 overflow-y-auto p-4 space-y-3'>
          {!match.chatMessages || match.chatMessages.length === 0 ? (
            <div className='text-center text-white/50 text-sm'>
              No messages yet. Say hello!
            </div>
          ) : (
            match.chatMessages.map((chatMessage: ChatMessage, index: number) => {
              // Check if this is a system message (null userId)
              const isSystemMessage = !chatMessage.userId;
              const isMe = !isSystemMessage && chatMessage.userId && (
                (chatMessage.userId as User)?._id?.toString() === user._id.toString() ||
                chatMessage.userId.toString() === user._id.toString()
              );

              if (isSystemMessage) {
                // System message - centered with special styling
                return (
                  <div key={index} className='flex justify-center'>
                    {renderSystemMessage(chatMessage)}
                  </div>
                );
              }

              return (
                <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 ${
                    isMe
                      ? 'bg-blue-500/80 text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    <div className='text-xs mb-1' style={{ color: isMe ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)' }}>
                      <FormattedUser
                        id={`chat-message-user-${(chatMessage.userId as User)?._id || 'unknown'}-${index}`}
                        user={chatMessage.userId as User}
                        size={Dimensions.AvatarSizeSmall}
                        hideAvatar={true}
                        className={isMe ? 'text-white/80 hover:text-white' : 'text-white/70 hover:text-white'}
                      />
                    </div>
                    <div className='text-sm'>{chatMessage.message}</div>
                    <div className='text-xs text-white/60 mt-1'>
                      {formatTime(chatMessage.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Input */}
        <form onSubmit={handleSendMessage} className='p-4 border-t border-white/20'>
          {connectedUsersCount && connectedUsersCount <= 1 ? (
            <div className='text-center text-white/50 text-sm py-2'>
              Chat is unavailable for this match (nobody else is in the room)
            </div>
          ) : (
            <div className='flex gap-2'>
              <input
                type='text'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='Type a message...'
                maxLength={200}
                className='flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                disabled={isSending}
              />
              <button
                type='submit'
                disabled={!message.trim() || isSending}
                className='bg-blue-500 hover:bg-blue-600 disabled:bg-white/20 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors'
              >
                {isSending ? '...' : 'Send'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
