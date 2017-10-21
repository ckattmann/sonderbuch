''' '''


def normalize_query(query_dict):
    normalized_query_dict = {}
    return normalized_query_dict


def result2dygraphs(query_result):
    data = []
    for point in query_result.get_points():
        # print(list(point.values()))
        data.append(list(point.values()))
    return data
