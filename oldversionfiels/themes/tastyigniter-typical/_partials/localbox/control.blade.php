<!-- PHP -->
<?php 
use Illuminate\Support\Facades\DB;
session_start();
$table_name = 'Table';
if (isset($_SESSION['table'])) {
    $id = $_SESSION['table_id'] =  $_SESSION['table'];
    $table_data = DB::table('tables')->where('table_id', $id)->first();
    $table_name = $table_data->table_name;
}

$tableSession = isset($_SESSION['qr']) ? $_SESSION['qr'] : null;
if (isset($_GET['order-type']) && $_GET['order-type'] !='' && $_GET['order-type'] !='null') {
    unset($_SESSION['qr']);
}
?>
@if (count($locationOrderTypes) <= $__SELF__->property('maxOrderTypeButtons', 1))
    <ul
        class="radio-switch"
        data-control="order-type-toggle"
        data-handler="{{ $orderTypeEventHandler }}"
    >
        @foreach($locationOrderTypes as $orderType)
            @continue($orderType->isDisabled())
            <li class="list-unstyled radio-switch__item">
                <input
                    id="btn-check-{{$orderType->getCode()}}"
                    type="radio"
                    name="order_type"
                    class="radio-switch__input visually-hidden"
                    value="{{ $orderType->getCode() }}"
                    {!! $orderType->isActive() ? 'checked="checked"' : '' !!}
                />
                <label
                    @if ($orderType->getCode() == 'delivery')
                    data-bs-tooltip="tooltip"
                    data-bs-placement="bottom"             
                        @if ($minOrderTotal = $location->minimumOrder($cart->subtotal()))
                            title="@lang('igniter.local::default.text_min_total'): {{ currency_format($minOrderTotal) }}"
                        @else
                            title="@lang('igniter.local::default.text_no_min_total')"
                        @endif
                    @endif
                    for="btn-check-{{$orderType->getCode()}}"
                    class="radio-switch__label {{ $orderType->isActive() ? 'active' : '' }}"
                >@partial('@control_info', ['orderType' => $orderType])</label>
                @if ($orderType->getCode() == 'collection')
                    <div class="radio-switch__marker" aria-hidden="true"></div>
                    <script>
                        // Script para mostrar el modal al cargar la pána solo si la opciós "collection"
                        document.addEventListener("DOMContentLoaded", function() {
                            var orderTypeInput = document.querySelector('input[name="order_type"][value="collection"]');
                            if (orderTypeInput.checked) {
                                var locationsModal = new bootstrap.Modal(document.getElementById('locationsModal'));
                                locationsModal.show();
                            }
                            orderTypeInput.addEventListener('click', function() {
                                if (orderTypeInput.checked) {
                                    locationsModal.show();
                                } else {
                                    locationsModal.hide();
                                }
                            });
                        });
                    </script>
                @endif
            </li>
        @endforeach
    </ul>
@else
    <div
        class="dropdown d-flex flex-column align-items-center"
        data-control="order-type-toggle"
        data-handler="{{ $orderTypeEventHandler }}"
    >
    <?php 
    $active = 'active';
    $act = '';
            
            if (isset($_SESSION['qr'])) {
                $active = '';
                ?>
                 <style>
                .ms-y,.ms-t,.ms-table-hide,.ms_add,.ms_city,.orderTimePicker{
                    display: none;
                }
              </style>
            <button class="btn btn-light btn-block dropdown-toggle" type="button" data-bs-toggle="dropdown" id="tableOrderTypes" aria-expanded="false">
         Table
        </button>
            <?php }else{ ?>
        <button
            class="btn btn-light btn-block dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
        >
            @partial('@control_info', ['orderType' => $location->getOrderType()])
        </button> 
        <?php } ?>
        <div class="dropdown-menu w-100" aria-labelledby="dropdownMenuButton">
        <?php 
    
            if (isset($_SESSION['table'])) {
                if (isset($_SESSION['qr'])) {
                  $act = 'active';
                }
                ?>
             <!-- Static "Table" Menu Item in Dropdown -->
             <a role="button" class="dropdown-item text-center <?php echo $act; ?>" data-order-type-codeu="table" id="tableOrderType">
                Table
            </a>
        
            <?php } ?>
            @foreach($locationOrderTypes as $orderType)
                @continue($orderType->isDisabled())
                <a
                    role="button" class="dropdown-item text-center {{ $orderType->isActive() ? "$active" : '' }}"
                    data-order-type-code="{{ $orderType->getCode() }}"
                >
                    @partial('@control_info', ['orderType' => $orderType])
                </a>
                @if ($orderType->getCode() == 'collection' && $orderType->isActive())
               
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        var collectionButtonlink = document.querySelector('.collection-link');
                        var collectionButton = document.querySelector('[data-order-type-code="collection"]');
                        var locationsModal = new bootstrap.Modal(document.getElementById('locationsModal'));
                        var modalShown = localStorage.getItem('collectionModalShown');

                        if (collectionButtonlink) {
                            collectionButtonlink.addEventListener('click', function() {
                                locationsModal.show();
                            });
                        }

                        if (collectionButton && collectionButton.classList.contains(''.$active.'') && !modalShown) {
                            locationsModal.show();
                            localStorage.setItem('collectionModalShown', 'true');
                        }
                    });
                </script>


                @endif
            @endforeach
            
        </div>
        @if ($location->getOrderType()->getCode() == 'collection')
            <div class="mt-2">
                <button class="btn btn-light btn-block collection-link dropdown-toggle" type="button">
                    Elegir Sucursal
                </button>
            </div>            
        @endif
    </div>
@endif
<script>
 document.addEventListener("DOMContentLoaded", function() {
    var dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(function(item) {
        item.addEventListener('click', function() {
            fetch('<?php echo $_SERVER['PHP_SELF']; ?>?action=unset_session')
                .then(response => response.text())
                .then(data => {
                    console.log('Session unset: ', data);
                    var dropdownButton = document.querySelector('.btn.dropdown-toggle');
                    if (dropdownButton) {
                        dropdownButton.textContent = "Table"; 
                        dropdownButton.classList.add("active");
                    }
                })
                .catch(error => console.error('Error:', error));
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
    var tableOrderType = document.getElementById('tableOrderType');
    var dropdownButton = document.querySelector('.btn.dropdown-toggle');
    if (tableOrderType) {
        tableOrderType.addEventListener('click', function () {
            dropdownButton.textContent = "Table"; 
            dropdownButton.classList.add("active"); 
        });
    }
});
document.addEventListener("DOMContentLoaded", function() {
    var tableOrderType = document.getElementById('tableOrderType');
    if (tableOrderType) {
        tableOrderType.addEventListener('click', function() {
            setTimeout(function() {
                var cv = document.querySelector('.ms-table-hide');
                var ms_y = document.querySelector('.ms-y');
                var ms_t = document.querySelector('.ms-t');
                var ms_add = document.querySelector('.ms_add');
                var ms_city = document.querySelector('.ms_city');
                var orderTimePicker = document.getElementById('orderTimePicker'); 
                cv.style.display = 'none';
                ms_y.style.display = 'none';
                ms_t.style.display = 'none';
                ms_add.style.display = 'none';
                ms_city.style.display = 'none';
                orderTimePicker.style.display = 'none';
            }, 400); 
        });
    }
});
</script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    $(document).ready(function () {
        var firstName = "<?php echo $table_name; ?>";
        $('.form-control.input-lg,#email,#first-name,#last-name,#hidden-input-telephone').val('');
        $(document).on('click', '#tableOrderType', function () {
            setTimeout(function () {
                $('.dropdown-item.text-center').removeClass('active')
                $('.dropdown-item.text-center#tableOrderType').addClass('active');
                $('.form-control.input-lg').val('Null');
                $('#first-name').val(firstName);
               $('#last-name').val('.');
                $('#email').val('example@gmail.com');
                $('#hidden-input-telephone').val('12345678');
            }, 300);
        });
    });
    document.addEventListener("DOMContentLoaded", function() {
    var dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var orderType = item.getAttribute('data-order-type-code'); 
            var currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('order-type', orderType);
            history.pushState(null, '', currentUrl.toString());
            var dropdownButton = document.querySelector('.btn.dropdown-toggle');
            if (dropdownButton) {
                dropdownButton.textContent = item.textContent;
            }
            console.log('URL Updated: ', currentUrl.toString());
        });
    });
});


</script>
<?php 
    
    if (isset($_SESSION['qr'])) {
        ?>
<script>
     var firstName = "<?php echo $table_name; ?>";
    $(document).ready(function () {
            setTimeout(function () {
                $('.form-control.input-lg').val('Null');
                $('#first-name').val(firstName);
            $('#last-name').val('.');
                $('#email').val('example@gmail.com');
                $('#hidden-input-telephone').val('12345678');
            }, 300);
        
    });
</script>
        <?php } ?>
