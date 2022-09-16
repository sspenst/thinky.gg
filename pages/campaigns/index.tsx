import { GetServerSidePropsContext } from 'next';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectFilter from '../../components/selectFilter';
import { enrichCampaign } from '../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Campaign, { EnrichedCampaign } from '../../models/db/campaign';
import { CampaignModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const campaigns = await CampaignModel.find<Campaign>()
    .populate({
      path: 'collections',
      populate: {
        match: { isDraft: false },
        path: 'levels',
        select: '_id leastMoves',
      },
      select: '_id levels name slug',
    }).sort({ name: 1 });

  if (!campaigns) {
    logger.error('CampaignModel.find returned null in pages/campaigns');

    return {
      notFound: true,
    };
  }

  const enrichedCampaigns = await Promise.all(campaigns.map(campaign => enrichCampaign(campaign, reqUser)));

  return {
    props: {
      enrichedCampaigns: JSON.parse(JSON.stringify(enrichedCampaigns)),
    } as CampaignsProps
  };
}

interface CampaignsProps {
  enrichedCampaigns: EnrichedCampaign[];
}

/* istanbul ignore next */
export default function Campaigns({ enrichedCampaigns }: CampaignsProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(FilterSelectOption.All);

  const getOptions = useCallback(() => {
    return enrichedCampaigns.map(enrichedCampaign => new SelectOption(
      enrichedCampaign._id.toString(),
      enrichedCampaign.name,
      `/campaign/${enrichedCampaign.slug}`,
      new SelectOptionStats(enrichedCampaign.levelCount, enrichedCampaign.userCompletedCount)
    )).filter(option => option.stats?.total);
  }, [enrichedCampaigns]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowFilter(showFilter === value ? FilterSelectOption.All : value);
  };

  return (
    <Page title={'Campaigns'}>
      <>
        <SelectFilter
          filter={showFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} campaign${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        <Select options={getFilteredOptions()} />
      </>
    </Page>
  );
}
