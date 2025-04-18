import { WeekData } from "../types";

interface CalendarViewProps {
  calendarWeeks: WeekData[];
}

export default function CalendarView({ calendarWeeks }: CalendarViewProps) {
  const getTaskBorderColor = (type: string) => {
    switch (type) {
      case 'study':
        return 'border-primary';
      case 'review':
        return 'border-secondary';
      case 'practice':
        return type === 'practice' && calendarWeeks.indexOf(calendarWeeks[calendarWeeks.length - 1]) ? 
          'border-green-500' : 'border-purple-500';
      default:
        return 'border-gray-300';
    }
  };

  const getTaskBgColor = (type: string) => {
    switch (type) {
      case 'study':
        return 'bg-blue-50';
      case 'review':
        return calendarWeeks.indexOf(calendarWeeks[calendarWeeks.length - 1]) === 0 ? 
          'bg-yellow-50' : 'bg-blue-50';
      case 'practice':
        return type === 'practice' && calendarWeeks.indexOf(calendarWeeks[calendarWeeks.length - 1]) === 0 ? 
          'bg-green-50' : 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-4">Calendar View</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monday
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wednesday
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Friday
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weekend
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calendarWeeks.map((week, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {week.weekRange}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {week.monday && (
                    <div className={`${getTaskBgColor(week.monday.type)} p-2 rounded-md border-l-4 ${getTaskBorderColor(week.monday.type)}`}>
                      <p className="font-medium">{week.monday.title}</p>
                      <p className="text-xs text-gray-500">{week.monday.duration} min - {week.monday.resource}</p>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {week.wednesday && (
                    <div className={`${getTaskBgColor(week.wednesday.type)} p-2 rounded-md border-l-4 ${getTaskBorderColor(week.wednesday.type)}`}>
                      <p className="font-medium">{week.wednesday.title}</p>
                      <p className="text-xs text-gray-500">{week.wednesday.duration} min - {week.wednesday.resource}</p>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {week.friday && (
                    <div className={`${getTaskBgColor(week.friday.type)} p-2 rounded-md border-l-4 ${getTaskBorderColor(week.friday.type)}`}>
                      <p className="font-medium">{week.friday.title}</p>
                      <p className="text-xs text-gray-500">{week.friday.duration} min - {week.friday.resource}</p>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {week.weekend && (
                    <div className={`${getTaskBgColor(week.weekend.type)} p-2 rounded-md border-l-4 ${getTaskBorderColor(week.weekend.type)}`}>
                      <p className="font-medium">{week.weekend.title}</p>
                      <p className="text-xs text-gray-500">{week.weekend.duration} min - {week.weekend.resource}</p>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
