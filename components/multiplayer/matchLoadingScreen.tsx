import React from 'react';
import Page from '@root/components/page/page';
import SpaceBackground from '@root/components/page/SpaceBackground';

interface MatchLoadingScreenProps {
  initialMatch?: boolean;
}

export default function MatchLoadingScreen({ initialMatch }: MatchLoadingScreenProps) {
  return (
    <Page title='Loading Match...'>
      <SpaceBackground
        constellationPattern='custom'
        customConstellations={[
          { left: '20%', top: '15%', size: '6px', color: 'bg-blue-400', delay: '0s', duration: '3s', glow: true },
          { left: '40%', top: '20%', size: '5px', color: 'bg-green-400', delay: '0.5s', duration: '2.5s', glow: true },
          { left: '60%', top: '18%', size: '7px', color: 'bg-purple-400', delay: '1s', duration: '3.5s', glow: true },
          { left: '80%', top: '25%', size: '6px', color: 'bg-pink-400', delay: '1.5s', duration: '2.8s', glow: true },
        ]}
        showGeometricShapes={true}
      >
        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12'>
          <div className='flex flex-col items-center justify-center min-h-[400px] gap-4 animate-fadeInDown'>
            <div className='relative'>
              <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-lg opacity-50' />
              <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-8 shadow-lg border border-white/20'>
                <div className='text-center'>
                  <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <span className='text-3xl text-white'>⚔️</span>
                  </div>
                  <h1 className='text-2xl font-bold mb-2'>
                    <span className='bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                      Loading Match
                    </span>
                  </h1>
                  {initialMatch ? (
                    <div className='text-sm text-white/70'>Connecting to live updates...</div>
                  ) : (
                    <div className='text-sm text-white/70'>Fetching match details...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SpaceBackground>
    </Page>
  );
}