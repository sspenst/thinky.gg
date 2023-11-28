import StatFilter from '@root/constants/statFilter';
import SelectOption from '../models/selectOption';

export default function filterSelectOptions(
  options: SelectOption[],
  statFilter: StatFilter,
  filterText: string,
) {
  if (statFilter === StatFilter.HideSolved) {
    options = options.filter((option: SelectOption) => option.stats?.userTotal !== option.stats?.total);
  } else if (statFilter === StatFilter.Solved) {
    options = options.filter((option: SelectOption) => option.stats && option.stats?.userTotal === option.stats?.total);
  } else if (statFilter === StatFilter.InProgress) {
    options = options.filter((option: SelectOption) => option.stats?.userTotal && option.stats.userTotal !== option.stats.total);
  }

  if (filterText.length > 0) {
    options = options.filter((option: SelectOption) => (option.searchLabel)?.toLowerCase().includes(filterText.toLowerCase()));
  }

  return options;
}
