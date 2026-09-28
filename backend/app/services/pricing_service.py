from app.models.settings import ShopSettings
from app.services.pdf_service import count_pages_in_range

def calculate_file_price(
    total_pages: int,
    page_range: str,
    copies: int,
    is_color: bool,
    is_double_sided: bool,
    paper_size: str,
    settings: ShopSettings
) -> float:
    effective_pages = count_pages_in_range(total_pages, page_range)
    
    if is_color:
        rate = settings.color_double_rate if is_double_sided else settings.color_single_rate
    else:
        rate = settings.bw_double_rate if is_double_sided else settings.bw_single_rate

    if paper_size.upper() == "A3":
        rate *= settings.a3_multiplier

    file_total = effective_pages * copies * rate
    return round(file_total, 2)
